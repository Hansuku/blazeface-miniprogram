// pages/camera/camera.js
import * as blazeface from '@tensorflow-models/blazeface';
let tensorModel = null
let cameraCtx = null
let cameraListener = null
Page({
  data: {
    result: '未检测到人脸',
    status: 0, // 0：未开启检测  1：开启检测
    faceImg: '',
    takePhotoLock: false
  },
  async onReady () {
    cameraCtx = wx.createCameraContext(this)
    tensorModel = await blazeface.load()
    // 创建每N帧扫描一次的动作
    let count = 0
    cameraListener = cameraCtx.onCameraFrame((frame) => {
      count ++
      if (count === 10) { 
        // console.log(frame)
        this.tensorMain(tensorModel, frame)
        count = 0
      }
    })
  },
  async addCameraListener () {
    if (this.data.status === 0) {
      cameraListener.start()
      this.setData({
        status: 1
      })
    } else {
      cameraListener.stop()
      this.setData({
        status: 0
      })
    }
  },
  async tensorMain(model, frame) {
    // 自己构造基于unit8array的imgData
    const imgData = { data: new Uint8Array(frame.data), width: frame.width, height: frame.height}
    const returnTensors = false
    const flipHorizontal = false
    const annotateBoxes = true
    const predictions = await model.estimateFaces(imgData, returnTensors, flipHorizontal, annotateBoxes)
    if (predictions && predictions.length > 0) {
      if (predictions.length === 1) {
        console.log(predictions)
        // 防止模糊的处理 只有五官匹配度高于0.999才拍照
        if (predictions[0].probability < 0.999) {
          return
        }
        this.setData({
          result: `当前检测到${predictions.length}张人脸，捕获图像中`
        })
        // 两秒锁 拍完一张照片以后再等两秒才能拍下一张
        if (this.data.takePhotoLock) {
          return
        }
        cameraCtx.takePhoto({
          success: (res) => {
            this.setData({
              faceImg: res.tempImagePath,
              takePhotoLock: true
            })
            setTimeout(() => {
              this.setData({
                takePhotoLock: false
              })
            }, 2000);
          }
        })
      } else {
        this.setData({
          result: `有其他小伙伴乱入啦！！当前检测到${predictions.length}张人脸`
        })
      }
    } else {
      this.setData({
        result: '未检测到人脸'
      })
    }
  },
})