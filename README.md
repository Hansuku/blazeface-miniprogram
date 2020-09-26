### 基于blazeface的小程序人脸识别实例

### Feature
基于微信creame的api，对返回的帧使用blazeface解析人脸

![demo](https://www.hansuku.com/wp-content/uploads/2020/09/d83d65b6-5d01-42c6-86db-4aeeb5e7c511.png)

### 如何演示
下载这个仓库，然后在小程序里导入项目即可，appid可以用测试号，代码相对都比较简单，关键的地方加了注释

### 如何在你的项目里植入blazeface
首先先去申请下`tensorflow.js`小程序版本的插件，点击[链接](https://mp.weixin.qq.com/wxopen/plugindevdoc?appid=wx6afed118d9e81df9)
然后在`app.json`里声明下，版本号改成最新的
```
{
  ...
  "plugins": {
    "tfjsPlugin": {
      "version": "0.1.0",
      "provider": "wx6afed118d9e81df9"
    }
  }
  ...
}
```
命令行里`npm init`一下（如果已经有`package.json`就不用了）
然后往`dependencies`里加入这些依赖然后`npm i`
```
  "dependencies": {
    "@tensorflow-models/blazeface": "0.0.5",
    "@tensorflow/tfjs-converter": "2.0.1",
    "@tensorflow/tfjs-core": "2.0.1",
    "@tensorflow/tfjs-backend-webgl": "2.0.1",
    "@tensorflow/tfjs-backend-cpu": "2.0.1",
    "fetch-wechat": "0.0.3"
  }
```
或者你可以直接`npm i @tensorflow-models/blazeface @tensorflow/tfjs-converter @tensorflow/tfjs-core @tensorflow/tfjs-backend-webgl @tensorflow/tfjs-backend-cpu fetch-wechat`

在小程序的入口文件`app.js`里注册tf：
```
const fetchWechat = require('fetch-wechat');
const tf = require('@tensorflow/tfjs-core');
const webgl = require('@tensorflow/tfjs-backend-webgl');
const plugin = requirePlugin('tfjsPlugin');

App({
  onLaunch: function () {
    plugin.configPlugin({
      // polyfill fetch function
      fetchFunc: fetchWechat.fetchFunc(),
      // inject tfjs runtime
      tf,
      // inject webgl backend
      webgl,
      // provide webgl canvas
      canvas: wx.createOffscreenCanvas()
    });
    ...

```
前往微信开发者工具-菜单栏-工具-构建NPM，本地设置里记得勾上“使用Npm模块”。
OK，正常情况下到这里准备就完成了，但是因为blazeface是google写的，理所当然他们的模型文件会放在tfhub上，那么很有可能你会下载不了他的模型，可以点这个链接试一下：https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1

如果发现进入不了或者后面在使用的时候获取不到model.json这个文件，要到`\miniprogram_npm\@tensorflow-models\blazeface\index.js`这个文件，然后拉到第12行，
```
// const BLAZEFACE_MODEL_URL = 'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1';
async function load({ maxFaces = 10, inputWidth = 128, inputHeight = 128, iouThreshold = 0.3, scoreThreshold = 0.75 } = {}) {
    // const blazeface = await tfconv.loadGraphModel(BLAZEFACE_MODEL_URL, { fromTFHub: true });
    const blazeface = await tfconv.loadGraphModel('https://cdn.hansuku.com/tensorflow/model.json');
    const model = new face_1.BlazeFaceModel(blazeface, inputWidth, inputHeight, maxFaces, iouThreshold, scoreThreshold);
    return model;
}
```
注意我注释的那两段话，我把他原先从tfhub上的资源指向了我自己的OSS里了，你可以在这个项目的model下找到`model.json`和`group1-shard1of1.bin`这两个文件，把这两个文件上传到你的OSS，并且保持他们在同一级目录，然后把这里的`model.json`地址指向你OSS的那个即可。

然后可以开始愉快的写代码了

##### 使用
```
import * as blazeface from '@tensorflow-models/blazeface';
let tensorModel = null

Page({
  async onReady () {
    tensorModel = await blazeface.load()
  },
})
```
这里就是把blazeface的模型加载出来，我推荐把`tensorModel `对象弄到全局，这样方便你后面的方法使用它：
```
const imgData = { data: new Uint8Array(frame.data), width: frame.width, height: frame.height}
const returnTensors = false
    const flipHorizontal = false
    const annotateBoxes = false
    const predictions = await tensorModel.estimateFaces(imgData, returnTensors, flipHorizontal, annotateBoxes)
```
`tensorModel.estimateFaces`这个方法允许传入HTMLIMAGE对象、HTMLVIDEO对象、canvas对象和ImageData，但是在小程序里你懂得，我们只能传入canvas对象和ImageData。

##### 其他参数含义：
- `returnTensors`:  是否返回tensor数据
- `flipHorizontal`:  画面是否需要水平翻转 主要针对移动端前置摄像头捕获的画面都是反转的，看实际需求开不开
- `annotateBoxes`:  是否返回五官数据，如果不开启返回的数据里就不会有`landmarks`这个参数

##### 返回值：
`predictions`会返回一个数组，如果长度为0就是没检测到人脸，长度是多少就是检测到了多少张人脸。数组中会返回包含人脸在当前画面中从0,0开始偏移的位置信息等，格式如下：
```
[
      {
        topLeft: [232.28, 145.26],
        bottomRight: [449.75, 308.36],
        probability: [0.998],
        landmarks: [
          [295.13, 177.64], // 右眼
          [382.32, 175.56], // 做眼
          [341.18, 205.03], // 鼻子
          [345.12, 250.61], // 嘴巴
          [252.76, 211.37], // 右耳
          [431.20, 204.93] // 左耳
        ]
      }
    ]
```
- `topLeft` 当前人脸位置的左上角顶点
- `bottomRight` 当前人脸位置的右下角定点
- `landmarks` 当前人脸五官的定位，顺序参照上面
- `probability` 识别精准度，0-1之间，越大越精准，可以通过这个来过滤一些误判，比如必须是0.9以上的你才认为他是个人脸