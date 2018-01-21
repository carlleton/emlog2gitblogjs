var http = require("http")
var fs = require('fs')
var mysql    = require('mysql')
var moment   = require('moment')
const bluebird = require('bluebird')
const Promise = bluebird.Promise
var Markdown = require('./tools/to-markdown')

var outfolder = './out' // md输出目录
var imgfromfolder = 'E:\\www\\emlog' //图片copy来源目录
var imgoutfolder = './outimg' // 图片输出目录
var replacehost = 'http://www.example.com' // 要处理的域名
var qiniuhost = 'http://xx.xx.qiniucloud.com' //要替换的七牛域名


var asynclength = 5
var users
var bloglist = []
var blogi = -1

// 连接数据库
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'emlog'
})

connection.connect()
// 查询数据库
function querydb (sql) {
  return new Promise(function (resolve, reject) {
    connection.query(sql, function (error, results, fields) {
      if (error) {
        reject(error)
        throw error;
      } else {
        resolve(results)
      }
    })
  })
}
// 识别图片
function readimg (content, gid) {
  const pattern = /!\[(.*?)\]\((.*?)\)/mg
  const result = []
  let matcher
  while ((matcher = pattern.exec(content)) !== null) {
    var src = matcher[2]
    if (src.indexOf(' ') > -1) {
      src = src.substr(0, src.indexOf(' '))
    }
    if (src == '') continue
    result.push({
      dst: matcher[0],
      alt: matcher[1],
      url: src
    })
  }
  return new Promise(async function (resolve, reject) {
    if (result.length == 0) {
      resolve(content)
      return
    }
    for (let i = 0, n = result.length; i < n; i++) {
      var url = result[i].url
      var oldurl = url
      url = url.replace(replacehost, '')
      if (url.indexOf('/path/to/') == 0) continue
      if (url.indexOf('data:image') == 0) continue
      if (url.indexOf('/admin/editor/plugins/emoticons/') > -1) {
        content = content.replace(result[i].dst, '')
        continue
      }
      if (url.indexOf('http://') == 0 || url.indexOf('https://') == 0) {
        var filename = url.substr(url.lastIndexOf('/'))
        var ext = filename.substr(filename.indexOf('.'))
        if (['.png','.jpeg','.jpg','.gif'].indexOf(ext) == -1) {
          ext = '.jpg'
        }
        filename = filename.substr(0, filename.indexOf('.')) + ext
        var dst = '/201801/' + filename
        var newfilename = '/UserFiles/image' + dst
        dst = imgoutfolder + dst
        var dstfolder = dst.substr(0, dst.lastIndexOf('/'))
        if (!fs.existsSync(dstfolder)) {
          fs.mkdirSync(dstfolder);
        }
        await http.get(url, async function(res){
          var imgData = ""
          res.setEncoding("binary") //一定要设置response的编码为binary否则会下载下来的图片打不开
          res.on("data", function (chunk) {
            imgData += chunk
          })
          res.on("end", async function () {
            if (!fs.existsSync(dstfolder)) {
              fs.mkdirSync(dstfolder);
            }
            await fs.writeFile(dst, imgData, "binary", function (err) {
              if (err) {
                console.log("下载失败：" + url)
              } else {
                newfilename = newfilename.replace('/UserFiles/image', qiniuhost)
                content = content.replace(url, newfilename)
                // console.log("down success");
              }
            })
          })
        })
      } else {
        url = url.replace('/content/uploadfile', '/UserFiles/image')
        url = url.replace('/uploadfile', '/UserFiles/image')
        url = url.replace('/Files/img', '/UserFiles/image')
        if (url.indexOf('/images') == 0) {
          url = '/UserFiles/image' + url.replace('/images', '')
        }
        var src = imgfromfolder + url
        var dst = imgoutfolder + url.replace('/UserFiles/image', '').replace('/UserFiles', '').replace('!600', '')
        var filename = url.substr(url.lastIndexOf('/'))
        var fileoldname = filename
        var ext = filename.substr(filename.indexOf('.'))
        if (['.png','.jpeg','.jpg','.gif'].indexOf(ext) == -1) {
          ext = '.jpg'
        }
        filename = filename.substr(0, filename.indexOf('.')) + ext
        dst = dst.replace(fileoldname, filename)
        url = url.replace(fileoldname, filename)
        var dstfolder = dst.substr(0, dst.lastIndexOf('/'))

        if (!fs.existsSync(dstfolder)) {
          fs.mkdirSync(dstfolder);
        }
        if (fs.existsSync(src)) {
          await fs.writeFileSync(dst, fs.readFileSync(src))
          url = url.replace('/UserFiles/image', qiniuhost)
          content = content.replace(oldurl, url)
          // await fs.createReadStream(src).pipe(fs.createWriteStream(dst))
        } else {
          console.log('不存在：' + src + ',gid:' + gid)
        }
      }
    }
    resolve(content)
  })
}
// 处理tag链接，主要是处理tag中相应的域名
function readtag (content) {
  var arr = content.split('[')
  if (arr.length <= 1) {
    return content
  }
  for (var i = 1, n = arr.length; i < n; i++) {
    var str = '[' + arr[i]
    const pattern = /\[([^(\])]*)\]\((http:\/\/(www\.)?example.com)?\/tag\/[^(\))]*\)/g
    const result = []
    let matcher
    while ((matcher = pattern.exec(content)) !== null) {
      var src = matcher[2]
      result.push({
        dst: matcher[0],
        alt: matcher[1],
        url: src
      })
    }
    for (var j = 0, m = result.length; j < m; j++) {
      // console.log(result[j].dst,result[j].alt)
      content = content.replace(result[j].dst,result[j].alt)
    }
  }
  return content
}

async function readblog (isreset) {
  if (!isreset) {
    blogi++
    if (blogi > bloglist.length - 1) {
      // connection.end();
      console.log('content end')
      return
    }
  }
  if (!users) {
    users = await querydb('select * from emlog_user')
  }
  var blog = bloglist[blogi]
  // console.log('开始：' + blog.gid)
  var sql = "select * from emlog_tag where gid like '%," + blog.gid + ",%'"
  tagresults = await querydb(sql)
  var tags = tagresults.map((obj) => obj.tagname).join(' ')
  var username = ''
  for (var i = 0, n = users.length; i < n; i++) {
    if(users[i].uid == blog.author) {
      username = users[i].username
      break
    }
  }
  var gid = blog.gid
  var title = blog.title
  var alias = blog.alias
  var date = date = moment(blog.date*1000).format('YYYY-MM-DD')
  var sortname = blog.sortname
  var summary = blog.excerpt || ''
  if (summary) {
    summary = Markdown.toMarkdown(summary)
    summary = summary.replace(/\n\n/g, '\n')
  }
  var content = blog.content || ''
  if (content) {
    content = Markdown.toMarkdown(content)
  }
  // 分析图片
  summary = await readimg(summary, gid)
  content = await readimg(content, gid)
  content = readtag(content)

  // 写入文件
  var data = `<!--
author: ${username} 
date: ${date} 
title: ${title} 
tags: ${tags} 
category: ${sortname} 
status: publish
summary: ${summary}
-->
${content}
`
  filename = gid + ".md"
  if (alias) {
    filename = alias + ".md"
  }
  await fs.writeFile(outfolder + '/' + filename, data,{flag:'w',encoding:'utf-8',mode:'0666'}, function (err) {
    if (err) {
      readblog(true)
    } else {
      readblog()
    }
  })
}
(async function () {
  var sql = 'select emlog_blog.*,emlog_sort.sortname from emlog_blog,emlog_sort where emlog_blog.sortid=emlog_sort.sid order by emlog_blog.gid desc'
  // sql = 'select emlog_blog.*,emlog_sort.sortname from emlog_blog,emlog_sort where emlog_blog.sortid=emlog_sort.sid and gid=1611 order by emlog_blog.gid desc'
  bloglist = await querydb(sql)
  readblog()
})()