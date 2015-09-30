'use strict';

/**
 * Module dependencies
 */

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('lodash');

//var glob = require('glob');

var _settings = [
  
  { 
    name: 'email.service', 
    setting: '',
    type: 'string',
    description: 'A "well-known service" that Nodemailer knows how to communicate with',
    title: 'Email Service',
    secure: true
  },
  { 
    name: 'email.auth',
    setting : '{"user": "", "pass": ""}',
    type: 'json',
    description: 'Authentication object as {user:"...", pass:"..."}',
    title: 'Email Authorization',
    secure: true
  },
  { 
    name: 'email.transporter',
    setting: 'Gmail',
    type: 'string',
    description: 'Custom transporter passed directly to nodemailer.createTransport (overrides service/auth)',
    title: 'Email Transporter',
    secure: true
  },

  /* Let's make this the default and not a setting
  { 
    name: 'email.templateDir',
    setting: '',
    type: 'string',
    description: 'Path to view templates relative to sails.config.appPath (defaults to views/emailTemplates)',
    title: 'Email Template Directory'
  },
  */

  { 
    name: 'email.from',
    setting: '',
    type: 'string',
    description: 'Default from email address',
    title: 'Email From',
    secure: true
  },
  { 
    name: 'email.testMode',
    setting: 'true',
    type: 'boolean',
    description: 'Flag indicating whether the hook is in "test mode". In test mode, email options and contents are written to a .tmp/email.txt file instead of being actually sent. Defaults to true.',
    title: 'Email Test Mode',
    secure: true
  },
  { 
    name: 'email.alwaysSendTo',
    setting: '',
    type: 'string',
    description: 'If set, all emails will be sent to this address regardless of the to option specified. Good for testing live emails without worrying about accidentally spamming people.',
    title: 'Email Always Send To',
    secure: true
  }

];


/**
 * Setup Emails
 * private
 */

//function _initializeFixtures () {
  //  return require('./lib/emails/templates').createTemplates()
    //.bind({ })
    /*
    .then(function (templates) {
      
      if(models.length === 0){
        var err = new Error();
        err.code = 'E_HOOK_INITIALIZE';
        err.name = 'Humpback Hook Error';
        err.message = 'humpback-email-hook: failed to create emails';
        return err;
      }
      
      this.templates = templates;

    })
    */
    //.catch(function (err) {
     /// sails.log.error(err);
    //});
//}


/**
 * Email Hook
 *
 * Integration with relevant parts of the nodemailer API.
 *
 * For a full list of available email options see:
 * https://github.com/andris9/Nodemailer#e-mail-message-fields
 *
 * @param  {App} sails humpback
 * @return {Object}
 * @hook
 */

var transport;
  //var self;

var _compileTemplate = function (view, data, cb) {
  // Use Sails View Hook if available
  if (sails.hooks.views && sails.hooks.views.render) {
    var relPath = path.relative(sails.config.paths.views, view);
    sails.hooks.views.render(relPath, data, cb);
    return;
  }

  // No Sails View hook, fallback to ejs
  fs.readFile(view + '.ejs', function (err, source) {
    if (err){
      return cb(err);
    } 

    try {
      var compileFn = ejs.compile((source || '').toString(), {
        cache: true, filename: view
      });

      cb(null, compileFn(data));
    } catch (e) {
      return cb(e);
    }
  });
};

var _resolveEmailSetting = function (name){
  return sails.config.humpback.secure[name] ? sails.config.humpback.secure[name] : sails.config.humpback.notsecure[name];
};

module.exports = function (sails) {
  return { 

    defaults: {
      humpback: {
        emailModelIdentity: 'email'
      },
      routes: {
        'get /admin/email': {
          view: 'admin/index',
          defaultPermissions: ['admin']
        },
        'get /admin/email/*': {
          view: 'admin/index',
          defaultPermissions: ['admin']
        }
      },
      __configKey__: {
        /*
        service: 'Gmail',
        auth: {
          user: 'myemailaddress@gmail.com',
          pass: 'mypassword'
        },
        */
        templateDir: path.resolve(sails.config.appPath, 'views/emailTemplates'),
        /*
        from: 'noreply@hydra.com',
        */
        testMode: true
      }
    },

    configure: function () {
      
      if (!_.isObject(sails.config.humpback)){
        sails.config.humpback = { };
      }
      if(!_.isObject(sails.config.humpback.barnacles)){
        sails.config.humpback.barnacles = { };
      }
      sails.config.humpback.barnacles.email = true;

      if (!_.isObject(sails.config.humpback.settings)){
        sails.config.humpback.settings = { };
      }
      sails.config.humpback.settings = _.extend(sails.config.humpback.settings, _settings);

      // Ensure we have the full path, relative to app directory
      sails.config[this.configKey].templateDir = path.resolve(sails.config.appPath, sails.config[this.configKey].templateDir);
     
    },
    initialize: function (next) {
    
      var self = this, err, eventsToWaitFor = [];
      
      //wait for orm hook to be loaded
      if (sails.hooks.orm) {
        eventsToWaitFor.push('hook:orm:loaded');
      }else{
        err = new Error();
        err.code = 'E_HOOK_INITIALIZE';
        err.name = 'Humpback Hook Error';
        err.message = 'The "humpback" email-hook depends on the "orm" hook- cannot load the "humpback" email-hook without it!';
        return next(err);
      }

      //wait for pub sub hook to be loaded
      if (sails.hooks.pubsub) {
        eventsToWaitFor.push('hook:pubsub:loaded');
      }else{
        err = new Error();
        err.code = 'E_HOOK_INITIALIZE';
        err.name = 'Humpback Hook Error';
        err.message = 'The "humpback" email-hook depends on the "pubsub" hook- cannot load the "humpback" email-hook without it!';
        return next(err);
      }

      //apply validation hook
      sails.after(eventsToWaitFor, function() {

        var EmailModel = sails.models[sails.config.humpback.emailModelIdentity];

        //bind custom errors logic
        if (!EmailModel) {
          err = new Error();
          err.code = 'E_HOOK_INITIALIZE';
          err.name = 'Humpback Email Hook Error';
          err.message = 'Could not load the humpback hook because `sails.config.humpback.emailModelIdentity` refers to an unknown model: "'+sails.config.humpback.emailModelIdentity+'".';
          if (sails.config.humpback.emailModelIdentity === 'email') {
            err.message += '\nThis option defaults to `email` if unspecified or invalid - maybe you need to set or correct it?';
          }
          return next(err);
        }


        //Promise.bind({}, _initializeFixtures()
          //.then(function (count) {
            sails.emit('hook:humpback:email:loaded');
            //sails.log.silly(count);

            // Optimization for later on: precompile all the templates here and
            // build up a directory of named functions.
            //
            if (sails.config[self.configKey].testMode) {
              transport = {
                sendMail: function (options, cb) {

                  // Add sent timestamp
                  options.sentAt = new Date();

                  // First check the .tmp directory exists
                  fs.exists(path.join(sails.config.appPath, '.tmp'), function (status) {
                    if (!status) {
                      fs.mkdir(path.join(sails.config.appPath, '.tmp'), function (err) {
                        if (err){
                          return cb(err);
                        } 
                        fs.appendFile(path.join(sails.config.appPath, '.tmp/email.txt'), JSON.stringify(options) + '\n', cb);
                      });
                      return;
                    }

                    // Otherwise just write to the .tmp/email.txt file
                    fs.appendFile(path.join(sails.config.appPath, '.tmp/email.txt'), JSON.stringify(options) + '\n', cb);
                  });
                }
              };
              // It's very important to trigger this callback method when you are finished
              // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
              return next();

            } else {

              try {

                if (sails.config[self.configKey].transporter) {
                  // If custom transporter is set, use that first
                  transport = nodemailer.createTransport(sails.config[self.configKey].transporter);
                } else {
                  // create reusable transport method (opens pool of SMTP connections)
                  var smtpPool = require('nodemailer-smtp-pool');
                  transport = nodemailer.createTransport(smtpPool({
                    service: sails.config[self.configKey].service,
                    auth: sails.config[self.configKey].auth
                  }));
                }

                // Auto generate text
                transport.use('compile', htmlToText());
                return next();
              }

              catch (e) {
                return next(e);
              }

            }
          /*
          })
          .catch(function (error) {
            sails.log.error(error);
            next(error);
          })
        );  
        */

      }); 
    },

    /**
     * Send an email.
     * @param  {Sting}    template (a named template to render)
     * @param  {Object}   data (data to pass into the template)
     * @param  {Object}   options (email options including to, from, etc)
     * @param  {Function} cb
     */

    send: function (template, data, options, cb) {

      //console.log(sails.config.humpback.settings);
      
      var self = this;

      data = data || {};
      
      // Turn off layouts by default
      if (typeof data.layout === 'undefined'){
        data.layout = false;
      } 

      var templateDir = sails.config[self.configKey].templateDir;
      var templatePath = path.join(templateDir, template);

      var from = _resolveEmailSetting('email.from');
      // Set some default options
      var defaultOptions = {
        from: from
      };

      sails.log.verbose('EMAILING:', options);

      async.auto({
        // Grab the HTML version of the email template
        compileHtmlTemplate: function (next) {
          _compileTemplate(templatePath + '/html', data, next);
        },

        // Grab the Text version of the email template
        compileTextTemplate: function (next) {
          _compileTemplate(templatePath + '/text', data, function (err, html) {
            // Don't exit out if there is an error, we can generate plaintext
            // from the HTML version of the template.
            if (err){
              return next();
            }
            next(null, html);
          });
        },

        // Send the email
        sendEmail: ['compileHtmlTemplate', 'compileTextTemplate', function (next, results) {

          defaultOptions.html = results.compileHtmlTemplate;
          
          if (results.compileTextTemplate){
            defaultOptions.text = results.compileTextTemplate;
          }

          // `options`, e.g.
          // {
          //   to: 'somebody@example.com',
          //   from: 'other@example.com',
          //   subject: 'Hello World'
          // }
          var mailOptions = _.defaults(options, defaultOptions);
          mailOptions.to = _resolveEmailSetting('email.alwaysSendTo') || mailOptions.to;

          transport.sendMail(mailOptions, next);
        }]

      },

      // ASYNC callback
      function (err, results) {
        if (err) {
          return cb(err);
        }

        cb(null, results.sendEmail);
      });
    }
  };
};

