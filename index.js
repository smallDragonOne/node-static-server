const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const zlib = require('zlib');
const mine = require('mime-types');


const jsonConfig = readConfigData();

function staticServer() {
    const defaults = {
        hostname: 'localhost',
        port: 3000,
        root: '',
        index: 'index.html',
        gzip: true,
        compress: 'html|css|js',
        openBrowser: false
    }

    const settings = Object.assign({}, defaults); // 合并配置

    if (jsonConfig && jsonConfig['httpOptions']){
        Object.assign(settings, jsonConfig['httpOptions']);
    }

    const rootPath = getHtmlRoot(settings.root);// 获取静态根目录路径

    const server = http.createServer((request, response)=>{
        let pathname = url.parse(request.url).pathname;
        //console.log("pathname" + pathname);
        if (pathname.slice(-1) === '/' && settings.index && settings.index !== '/'){
            response.writeHead(302, {
                'Location': '/' + settings.index
            })
            response.end();
            return;
        }
        const filePath = path.join(rootPath, pathname);
        console.log("filePath: " + filePath);
        if (fs.existsSync(filePath)){
            try {
                const mimeType = mine.lookup(filePath);
                response.setHeader('Content-Type',mimeType || 'text/plain');

                const raw = fs.createReadStream(filePath);
                const ext = path.extname(filePath).slice(1);
                const acceptEncoding = request.headers['accept-encoding'];
                const gzipExt = settings.gzip && settings.compress.includes(ext); // 开启了gzip压缩，且文件类型在压缩格式范围内

                if (gzipExt && acceptEncoding.includes('gzip')) {
                    response.writeHead(200, "Ok", { 'Content-Encoding': 'gzip' });
                    raw.pipe(zlib.createGzip()).pipe(response);
                } else if (gzipExt && acceptEncoding.includes('deflate')) {
                    response.writeHead(200, "Ok", { 'Content-Encoding': 'deflate' });
                    raw.pipe(zlib.createDeflate()).pipe(response);
                } else {
                    response.writeHead(200, "Ok");
                    raw.pipe(response);
                }
            }
            catch (err){
                response.writeHead(500,{'Content-Type':'text/plain'});
                //console.log(err.);
                response.end();
            }
        }
        else{
            response.writeHead(400,{'Content-Type':'text/plain'});
            response.write("this request URL : " + pathname + " is not found!");
            response.end();
        }
    });

    // 打开默认浏览器
    const openDefaultBrowser = (url) => {
        const { exec } = require('child_process');
        console.log(process.platform)
        switch (process.platform) {
            case "darwin":
                exec('open ' + url);
                break;
            case "win32":
                exec('start ' + url);
                break;
            default:
                exec('xdg-open', [url]);
        }
    }

    //监听主机端口
    const { hostname, port, openBrowser } = settings;
    server.listen(port, hostname, () => {
        const url = `http://${hostname}:${port}`
        console.log(`服务器运行在 ${url}`);
        openBrowser && openDefaultBrowser(url); // 打开默认浏览器
    });

}

function readConfigData(){
    let configPath = path.join(process.cwd(), './config.json');

    if (fs.existsSync(configPath)){
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return null;
}


function getHtmlRoot(root){
    if (!root) return process.cwd();
    else return root;
}



// 启动静态服务器
staticServer();
/*
staticServer({
    hostname: '127.0.0.1',  //主机
    port: 3000, // 端口
    root: '', // 静态文件目录
    index: 'html/index.html', // 入口文件
    gzip: true, // 开启gzip压缩
    compress: 'html|css|js', // 压缩这三种格式
    openBrowser: true  // 服务启动后自动打开浏览器
});*/

