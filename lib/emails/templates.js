'use strict';
//var fs = require('fs');

/**
 * Loops through `views/emailTemplates/` and decides if files are 
 * newer than database records and then syncs them.
 * @public
 */

exports.createTemplates = function () {

	var Email = sails.models[sails.config.humpback.emailModelIdentity];

	var templates = [];

	return Promise.map(templates, function(template){
		return Email.findOrCreate({name : template.name}, template);
	});

};