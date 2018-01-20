var fs = require('fs')
var mysql    = require('mysql')
var moment   = require('moment')
const bluebird = require('bluebird')
const Promise = bluebird.Promise
var Markdown = require('./tools/Markdown')

var outfolder = './out' // 到处md目录

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

async function readblog (isreset) {
  if (!isreset) {
    blogi++
    if (blogi > bloglist.length - 1) {
      connection.end();
      return
    }
  }
  console.log('开始：' + blogi)
  if (!users) {
    users = await querydb('select * from emlog_user')
  }
  var blog = bloglist[blogi]
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
  }
  var content = blog.content || ''
  if (content) {
    content = Markdown.toMarkdown(content)
  }

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
  var sql = 'select emlog_blog.*,emlog_sort.sortname from emlog_blog,emlog_sort where emlog_blog.sortid=emlog_sort.sid'
  bloglist = await querydb(sql)
  readblog()
})()