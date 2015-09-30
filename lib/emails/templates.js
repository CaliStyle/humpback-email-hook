'use strict';
var fs = require('fs');
//var path = require('path');
var glob = require('glob');

/**
 * Loops through `views/emailTemplates/` and decides if files are 
 * newer than database records and then syncs them.
 * @public
 */

exports.template = function () {

};

exports.createTemplates = function () {

	var Email = sails.models[sails.config.humpback.emailModelIdentity];
	
	var options = { root: sails.config.appPath };

	function _getFiles () {
		return new Promise(function(resolve, reject) {
    		
    		glob('/views/emailTemplates/**/html.ejs', options, function (err, files) {
			 
				if(err){
					reject(err);
				}
				resolve(files);
			});
    	});
	}

	function _getTemplates (folder) {
		return new Promise(function(resolve, reject) {
    		
    		glob('/views/emailTemplates/' + folder + '/*.ejs', options, function (err, files) {

				if(err){
					reject(err);
				}
				var template = {};

				template[folder] = {
					html: files[0],
					text: files[1]
				};

				resolve(template);

			});
    	});
	} 

	/*
	function _readFile(file) {
		return new Promise(function(resolve, reject) {
			
			fs.readFile(file, 'utf8', function (err,data) {
			  if (err) {
			    reject(err);
			  }
			  console.log(data);
			  resolve(data);
			});

		});
	}
	*/

	function _compareFileLm(model, file) {
		console.log(file);
		return new Promise(function(resolve, reject) {	
			fs.stat(file, function(err, data){
				
				if (err) {
					reject(err);
				}
				console.log(data);
				resolve(data);

			});
		});
	}

	return Promise.bind({}, _getFiles()
		.then(function(files){
			this.files = files; 

			return Promise.map(files, function(file){
				
				var fileArray = file.split('/');
				var folder = fileArray[fileArray.length - 2];

				return _getTemplates(folder);
				//return Email.findOrCreate({name: name}, {});
			});
		})
		.then(function(templates){
			console.log(templates);
			this.templates = templates;

			return Promise.map(templates, function(files, name){
				
				//var que = [];
				var template = {
					name: name,
					htmlFile: files.html,
					textFile: files.text,
					html: null,
					text: null

				};

				return Email.findOrCreate({name: name}, template);
			
			});
		})
		.then(function(emails){
			this.emails = emails;

			var que = [];
			
			_.each(emails, function(email){
				
				if(email.htmlFile){
					que.push(
						_compareFileLm(email, email.htmlFile)
					);
				}
			
			});

			return Promise.all(que);

		})
		.then(function(files){
			console.log(files);
			return files;
		})
		.catch(function(e){
			sails.log.error(e);
			return e;
		})
	);

};