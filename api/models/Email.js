/**
* Email.js
*
* @description    :: Stores the Email Templates 
* @humpback-docs  :: https://github.com/CaliStyle/humpback/wiki/Models#email
* @sails-docs     :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
	
	description: [
        'Defines a particular Email Template that can be used.'
    ].join(' '),
  
    autoCreatedBy: true,
  
    autoCreatedAt: true,
  
    autoUpdatedAt: true,

    reserved: true,
  	
  	permissions: {
	    'registered': {
			'create': {action: false,	relation: false},
			'read' 	: {action: false,	relation: false},
    		'update': {action: false,	relation: false},
    		'delete': {action: false,	relation: false}		
    	},
		'public': {
			'create': {action: false,	relation: false},
			'read' 	: {action: false,	relation: false},
    		'update': {action: false,	relation: false},
    		'delete': {action: false,	relation: false}
		}
  	},

	attributes: {
        name: {
            type: 'string',
            unique: true,
            index: true
        },
        htmlFile: {
            type: 'string'
        },
        html: {
            type: 'string'
        },
        textFile: {
            type: 'string'
        },
        text: {
            type: 'string'
        },
        webhooks: {
            type: 'array',
            defaultsTo: []
        }
    }
}