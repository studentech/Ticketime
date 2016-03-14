var cheerio = require("cheerio");
var request = require("request");
var path = require('path');
var fs = require('fs');
var db = require('./db');
var server = require("./curl");
var async = require('async');

//var aurl = 'http://www.gewara.com/nanjing';
var murl = 'http://m.gewara.com/movie/m/choiceMovieSim.xhtml?';
//var allurl = 'http://www.gewara.com/movie/searchMovieStore.xhtml?pageNo=';
//http://www.gewara.com/movie/searchMovieStore.xhtml?pageNo=1&order=releasedate&movietime=all
var furl = 'http://www.gewara.com/movie/searchMovie.xhtml?pageNo=';
var curl = 'http://www.gewara.com/movie/searchCinema.xhtml?pageNo=';

//拼接价格页面
//2016-2-28 23:44 @studentech 改写getPrice(),基本思路为：添加callback回调，处理post数据
exports.getPrice = function(){
    db.getLists(['f_id'],'film_info',function(err,results){
        // for(var i in results){
        // 	fids.push(results[i].f_id);
        // }

        //日期格式化
        var myDate = new Date();
        var year = myDate.getFullYear();    //获取完整的年份(4位,1970-????)
        var month = myDate.getMonth()+1;       //获取当前月份(0-11,0代表1月)
        var date = myDate.getDate()+1;        //获取当前日(1-31)
        var nowDate = year + '-' + month + '-' + date;
        //console.log(nowDate);


        var fids = results;
        var count = 1;
        db.getLists(['c_id'],'cinema_info',function(err,results){
            var cids = results;
            var urls = [];
            var currencyCount = 0;
            for(var i in fids){
                for(var j in cids){
                    urls.push({
                        cid : cids[j].c_id,
                        mid : fids[i].f_id,
                        openDate : nowDate
                    });
                }

            }
            // var p_url = murl + 'cid=' + urls[0].cid + '&mid=' + urls[0].mid + '&openDate=' + urls[0].openDate;
            // spliceBuyPage(p_url);

            // console.log(urls);
            // 2016-2-28-0:02 @studentech 正在重写ing
            var count = 0;
            async.mapLimit(urls, 1, function (url, callback) {
                currencyCount++;
                var p_url = murl + 'cid=' + url.cid + '&mid=' + url.mid + '&openDate=' + url.openDate;
                console.log('【'+(++count)+'】现在的并发数是',currencyCount, '，正在处理' + p_url);
                spliceBuyPage(p_url,function(){
                    //读文件
                    fs.readFile('./public/tempData','utf-8',function(err,data){
                        if(err){
                            console.log('read Failed');
                        }else{
                            var $ = cheerio.load(data);
                            var info = [];
                            //var base_info = new Array(url.cid,url.mid,url.openDate,'1');
                            if($('.ui_accordionNotice')==''){
                                $('.box').each(function(){
                                    // var test = $(this).find('a').attr('href');
                                    //getSplicePageInfo(base_info,info,$(this));
                                    var href = $(this).find('a').attr('href');
                                    var id = href.match(/\d*$/)[0];//购买场次唯一id
                                    var price = $(this).find('.price > b').text();
                                    var time_s = $(this).find('.time > b').text();
                                    var time_e = $(this).find('.time > em').text().substr(0,5);
                                    var standard =  $(this).find('.room >b').text();
                                    //console.log('[price]:' + price);
                                    //console.log(id);
                                    info.push({
                                        price_id : id,//价格id
                                        price : price,//影片价格
                                        start_time : time_s,//开始时间
                                        end_time : time_e,//散场时间
                                        standard : standard,//规格标准（2D/3D/IMAX.../Language）
                                        c_id : url.cid,//影院id
                                        f_id : url.mid,//影片id
                                        date : url.openDate,//购票日期
                                        p_id : '1'//平台id
                                    });
                                });
                                db.saveData(info,'film_price');
                                //setTimeout(db.saveData(info,'film_price'), 10);
                            }else{
                                return 0;
                            }

                        }
                    });

                });
                setTimeout(function () {
                    currencyCount--;
                    callback(null,url);
                }, 1200);
            }, function (err, result) {
                //console.log(result);
                console.log('已完成' + result.length +'条信息处理');
            });

        });

    });
}


//抓取电影院数据
exports.getCinameData = function(){
    for(var i = 0; i < 7; i++){
        urls = curl + i;
        //urls = allurl + i + '&order=clickedtimes&movietime=all';
        server.getData(urls,function(data){
            if(data){
                var $ = cheerio.load(data);
                var info = [];
                $('.effectLi').each(function(){
                    getCinamePageInfo(info,$(this));
                });

                setTimeout(db.saveData(info,'cinema_info'), parseInt(Math.random() * 2000));
            }else{
                console.log('error');
            }
        })
        console.log('获取站点第'+(i+1)+'页数据成功');
    }
}
//抓取当前上映电影数据
exports.getFilmData = function(page_from , page_to){
    //var page_to = 20;
    for(var i = page_from-1; i < page_to; i++){
        urls = furl + i;
        //urls = allurl + i + '&order=clickedtimes&movietime=all';
        server.getData(urls,function(data){
            if(data){
                var $ = cheerio.load(data);
                var info = [];
                $('.effectLi').each(function(){
                    getFilmPageInfo(info,$(this));
                });

                setTimeout(db.saveData(info,'film_info'), parseInt(Math.random() * 2000));
            }else{
                console.log('error');
            }
        })
        console.log('获取站点第'+(i+1)+'页数据成功');
    }
}

//处理影院单页数据
var getCinamePageInfo = function(arr,$$){
    var that = $$.children()
    var picsrc = that.find('img').css('background').match(/\((.*)\)/)[0].replace(/\(|\)/g,"");
    var title = that.find('.color3').attr('title');
    var address = that.find('.mt10').text().replace(/\s+/g,"").match(/\](.*)\[/)[0].replace(/\[|\]/g,"");
    var area_id = that.find('.c999').attr('href').match(/\d*$/)[0];
    var area = that.find('.c999').text().replace(/\[|\]/g,"");
    var c_href = that.find('.color3').attr('href');
    c_href = formatHref(c_href);
    var c_id = c_href.match(/\d*$/)[0];
    arr.push({
        c_id : c_id,//id
        c_picsrc : picsrc,//影院logo地址
        c_name : title,//影院名称
        c_address : address,//影院地址
        c_area_id : area_id,//影院行政区域id
        c_area : area,//影院行政区域
        c_href : c_href//影院链接
    });

}

//处理影片单页数据
var getFilmPageInfo = function(arr,$$){
    var that = $$.children().find('.ui_text').children();
    var grade = that.find('sub').text() + that.find('sup').text();
    var picsrc = $$.children().find('img').attr('src');
    var filmhref = $$.children().find('.color3').attr('href');
    filmhref = formatHref(filmhref);
    //匹配末尾film_id
    var film_id = filmhref.match(/\d*$/)[0];
    var title = $$.children().find('.color3').attr('title');
    arr.push({
        f_id : film_id,//id
        name : title,//影名
        type : that.eq(-6).text().substr(3),//类型
        picsrc : picsrc,//封面海报地址
        language : that.eq(-5).text().substr(3),//语言
        mins : that.eq(-4).text().substr(3),//时长
        director : that.eq(-3).text().substr(3),//导演
        actor : that.eq(-2).text().substr(3),//主演
        grade : grade,//评分
        f_href : filmhref //链接地址
        // f_id : film_id,//id
        // name : title,//影名
        // start_date : that.eq(-7).text().substr(5),//上映时间
        // type : that.eq(-6).text().substr(5),//类型
        // country : that.eq(-5).text().substr(6),//国家
        // picsrc : picsrc,//封面海报地址
        // language : that.eq(-4).text().substr(3),//语言
        // //过滤所有空格
        // mins : that.eq(-3).text().substr(3).replace(/\s/g,''),//时长
        // director : that.eq(-2).text().substr(3),//导演
        // actor : that.eq(-1).text().substr(3),//主演
        // f_href : filmhref //链接地址
    })
};

//开启子线程casperjs抓取价格信息
var spliceBuyPage = function(myurl,callback){
    var count = 0;
    console.log('主进程开启');
    var startTime = new Date().getTime();
    /*
     获取需要采集的url列表
     */
    //var murl = 'http://m.gewara.com/movie/m/choiceMovieSim.xhtml?cid=100795420&mid=278455503&openDate=2016-02-28';

    /*
     启动casperjs读取单个url
     */
    function capture(url) {
        count++;
        var spawn = require('child_process').spawn,
            ls = spawn('casperjs', ['getAjaxData.js', url]);

        ls.on('close', function(code) {
            if (code == 1) {
                console.log('child process异常结束。目标：' + url);
            }
        });

    }
    //开始执行
    capture(myurl);
    callback();
}

//处理价格页信息
var getSplicePageInfo = function(base,arr,$$){
    var href = $$.find('a').attr('href');
    var id = href.match(/\d*$/)[0];//购买场次唯一id
    var price = $$.find('.price > b').text();
    var time_s = $$.find('.time > b').text();
    var time_e = $$.find('.time > em').text().substr(0,5);
    var standard =  $$.find('.room >b').text();
    //console.log('[price]:' + price);
    //console.log(id);
    arr.push({
        price_id : id,//价格id
        price : price,//影片价格
        start_time : time_s,//开始时间
        end_time : time_e,//散场时间
        standard : standard,//规格标准（2D/3D/IMAX.../Language）
        c_id : base[0],//影院id
        f_id : base[1],//影片id
        date : base[2],//购票日期
        p_id : base[3]//平台id
    });
}



//格式化地址
var formatHref = function(href){
    var rootsite = 'http://www.gewara.com';
    return(rootsite + href);
}

//格式化时间
var formatMins = function(str){
    var res = str.replace(/\s/g,'');
}