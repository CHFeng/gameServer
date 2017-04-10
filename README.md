1. 複製 config.sample.js 並變更名稱為 config.js
2. 修改 config.js 內 <i>dblink</i> 為資料庫連線位置
3. 利用 <i>node-gyp -v</i> 檢查 node-gyp 是否安裝
4. 使用 node-gyp 編譯 randNativeModule
5. <i>node-gyp configure</i> 編譯前初始化
6. <i>node-gyp build</i> 開始編譯
7. 編譯完成後,複製 <i>build/Release/randBuf.node<i> 到 randBuf資料夾