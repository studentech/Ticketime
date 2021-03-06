var mysql = require('mysql');
var db  = mysql.createPool({
	connectionLimit : 50,
	host            : 'surge.studio',
	user            : 'root',
	password        : 'xzc951108',
	database 		  : 'ticket',
	charset		  : 'utf8'
});

//入库操作
var count = 0;
exports.saveData = function(data,table_name){
	var len = data.length;
	db.getConnection(function(err,connection){
		if(err){
			console.error('error poolconnecting:'+err.stack);
			return;
		}
		// connection.query('DELETE FROM film_info', function (err, result) {
		//   if (err) throw err;
		// })
		if(len){
			for(var i in data){
				var res = connection.query('REPLACE INTO ?? SET ?',[table_name , data[i]],function(err,result){
					if(err){
						throw err;
					}
				});
				console.log('THE '+(++count)+' save success!');
			}
			connection.release();			
		}
	});
}
//UPDATE
exports.insertData = function(table_name,set,where,data,callback){
	var len = data.length;
	db.getConnection(function(err,connection){
		if(err){
			console.error('error pool connecting:'+err.stack);
			return;
		}
		if(len){
			for(var i in data){
				var mysql = 'UPDATE '+table_name+" SET "+set+"= '" + data[i].id + "' WHERE "+ where +" = '" + data[i].fname + "';";
				console.log(mysql);
				db.query(mysql,callback);
				console.log('THE '+(++count)+' save success!');
			}
			connection.release();
		}
	});
}
//基础SQL使用
exports.useSql = function(mysql,callback){
	db.getConnection(function(err,connection){
		if(err){
			console.error('error poolconnecting:' + err.stack);
			return;
		}
		db.query(mysql,callback);
		connection.release();
	});

	//callback();

}

//查询数据列表
exports.getLists = function(columns,table_name,fn){
	db.getConnection(function(err,connection){
		if(err){
			console.error('error poolconnecting:' + err.stack);
			return;
		}
		//var columns = ['name' ,'picsrc' ,'type' ,'mins' ,'language' ,'director' ,'actor' ,'f_href' ,'grade'];
		connection.query('SELECT ?? FROM ??', [columns, table_name], fn);
		connection.release();
	});
	//return fn;
}
//获取所有列表
exports.getAllLists = function(table_name,fn){
	db.getConnection(function(err,connection){
		if(err){
			console.error('error poolconnecting:' + err.stack);
			return;
		}
		connection.query('SELECT * FROM ??', [table_name], fn);
		connection.release();
	});
}


//条件查询
exports.findDate = function(columns,table_name,key,value,fn){
	db.getConnection(function(err,connection){
		if(err){
			console.error('error poolconnecting:' + err.stack);
			return;
		}
		connection.query('SELECT ?? FROM ?? WHERE ?? = ?', [columns, table_name, key, value], fn);

		connection.release();
	});	
	//return fn();
}


