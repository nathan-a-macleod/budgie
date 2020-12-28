const mime=require("mime-types");
const path=require("path");
const open=require("open");
const fs=require("fs");
let cmd=process.argv[2];
let project=".";
let source=".";

// Throw an error
function error(msg){
  process.stderr.write("Error: ");
  process.stderr.write(msg);
  process.stderr.write("\n");
  process.exit(1);
}

// Default files
function getDefaultConfig(){
  return "{\n\t\"name\":\"Arcade\",\n\t\"latency\":200,\n\t\"viewport\":{\n\t\t\"width\":1500,\n\t\t\"height\":1000\n\t}\n}\n";
}
function getDefaultIndex(){
  return "// Welcome to Arcade!\n// Brought to you by LugoCorp\n\narcade.onstart=function(){}\n\narcade.onclick=function(){}\n\narcade.onkeyevent=function(evt){}\n\narcade.onframe=function(delta){}\n";
}

// Build helpers
function recursiveList(dir){
  let files=[];
  let folders=[dir];
  while(folders.length){
    dir=folders.splice(0,1)[0];
    let lst=fs.readdirSync(dir);
    for(var a=0;a<lst.length;a++){
      let file=`${dir}/${lst[a]}`;
      if(fs.statSync(file).isDirectory()) folders.push(file);
      else files.push(file);
    }
  }
  return files;
}
function getKey(name){
  var key="";
  for(var a=0;a<name.length;a++){
    let c=name.charAt(a);
    if(c==' ') key+='_';
    else if(c>='a' && c<='z') key+=c;
    else if(c>='A' && c<='Z') key+=c.toLowerCase();
  }
  return key;
}
function getFontName(filepath){
  var lst=filepath.split("/");
  var pieces=lst[lst.length-1].split(".");
  pieces.splice(pieces.length-1,1);
  return pieces.join(".");
}
function getAssetsByType(assets,type){
  return assets.filter(x => mime.lookup(x).split("/")[0]==type);
}

// Command handling
if(cmd=="init"){
  project=process.argv[3];
  if(fs.existsSync(project)) error("That project already exists");

  // Setup project structure
  fs.mkdirSync(project,{recursive:true});
  fs.mkdirSync(`${project}/assets`);
  fs.mkdirSync(`${project}/src`);

  // Create default files
  fs.writeFileSync(`${project}/arcade.json`,getDefaultConfig());
  fs.writeFileSync(`${project}/src/index.js`,getDefaultIndex());

  // Copy the lib directory
  fs.mkdirSync(`${project}/lib`);
  let lst=fs.readdirSync(`${source}/lib`);
  for(var a=0;a<lst.length;a++){
    fs.copyFileSync(`${source}/lib/${lst[a]}`,`${project}/lib/${lst[a]}`);
  }
}else if(cmd=="build"){
  var config;
  var data;
  try{
    data=fs.readFileSync(`${project}/arcade.json`);
    config=JSON.parse(data.toString());
  }catch(err){
    error("Missing or invalid arcade.json file");
  }
  let key=getKey(config.name);
  let assets=recursiveList(`${project}/assets`);
  let libs=recursiveList(`${project}/lib`).map(x => `<script src="lib/${x}"></script>`).join("");
  let user=recursiveList(`${project}/src`).map(x => `<script src="src/${x}"></script>`).join("");
  let images=getAssetsByType(assets,"image").map(x => `arcade.assets._registerImage("assets/${x}");`).join("");
  let audios=getAssetsByType(assets,"audio").map(x => `arcade.assets._registerAudio("assets/${x}");`).join("");
  let fonts=getAssetsByType(assets,"font").map(x => `@font-face{font-family:"${getFontName(x)}";src:url("assets/${x}");}`).join("");
  let html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${config.name}</title>${libs}</head><body onkeyup="arcade._onkeyup(event)" onkeydown="arcade._onkeydown(event)" onresize="arcade._onresize()"><canvas id="canvas" width="500" height="300" onmousemove="arcade._onmousemove(event)" onmouseup="arcade._onclick(event)"></canvas></body><style>body{background-color:black;padding:0;margin:0;}canvas{transform:translate(-50%,-50%);background-color:white;position:absolute;left:50%;top:50%;}${fonts}</style><script>let arcade=new Arcade("${key}",${config.latency},${config.viewport.width},${config.viewport.height});</script>${user}<script>${images}${audios}arcade.assets._check();</script></html>`;
  fs.writeFileSync(`${project}/index.html`,html);
}else if(cmd=="open"){
  let file=path.resolve(`${project}/index.html`);
  open(`file://${file}`);
}else{
  console.log("Usage: arcade command");
  console.log("  init    Initializes a new project");
  console.log("  build   Builds your project into an HTML5 game");
  console.log("  open    Opens your project in the browser");
}