##Humpback Email Hook

## Status

> ##### Stability: [1](http://nodejs.org/api/documentation.html#documentation_stability_index) - Experimental

This is the Email "hook" for humpback.  All humpback hooks we refer to as 
barnacles.  This hook does the following:
  * Creates a GUI email interface
  * Allows for Email Configuration and Email Templates

[![Dependency Status](https://david-dm.org/CaliStyle/humpback-email-hook.svg)](https://david-dm.org/CaliStyle/humpback-email-hook)

Email hook for [Humpback](https://github.com/CaliStyle/humpback), using [Nodemailer](https://github.com/andris9/Nodemailer/blob/v1.3.4/README.md)

*Note: This requires Sails v0.11.0+.*

### Installation

`npm install humpback-email-hook`

### Usage

`sails.hooks.['humpback-email-hook'].send(template, data, options, cb)`

Parameter      | Type                | Details
-------------- | ------------------- |:---------------------------------
template       | ((string))          | Relative path from `templateDir` (see "Configuration" below) to a folder containing email templates.
data           | ((object))          | Data to use to replace template tokens
options        | ((object))          | Email sending options (see [Nodemailer docs](https://github.com/andris9/Nodemailer/blob/v1.3.4/README.md#e-mail-message-fields))
cb             | ((function))        | Callback to be run after the email sends (or if an error occurs).

### Configuration

By default, configuration lives in `sails.config.email`.  The configuration key (`email`) can be changed by setting `sails.config.hooks['sails-hook-email'].configKey`.

Parameter      | Type                | Details
-------------- | ------------------- |:---------------------------------
service        | ((string)) | A "well-known service" that Nodemailer knows how to communicate with (see [this list of services](https://github.com/andris9/nodemailer-wellknown/blob/v0.1.5/README.md#supported-services))
auth | ((object)) | Authentication object as `{user:"...", pass:"..."}`
transporter | ((object)) | Custom transporter passed directly to nodemailer.createTransport (overrides service/auth) (see [Available Transports](https://github.com/andris9/Nodemailer/blob/v1.3.4/README.md#available-transports))
templateDir | ((string)) | Path to view templates relative to `sails.config.appPath` (defaults to `views/emailTemplates`)
from | ((string)) | Default `from` email address
testMode | ((boolean)) | Flag indicating whether the hook is in "test mode".  In test mode, email options and contents are written to a `.tmp/email.txt` file instead of being actually sent.  Defaults to `true`.
alwaysSendTo | ((string)) | If set, all emails will be sent to this address regardless of the `to` option specified.  Good for testing live emails without worrying about accidentally spamming people.

### Templates

Templates are generated using your configured Sails [View Engine](http://sailsjs.org/#!/documentation/concepts/Views/ViewEngines.html), allowing for multiple template engines and layouts.  If Sails Views are disabled, will fallback to EJS templates. To define a new email template, create a new folder with the template name inside your `templateDir` directory, and add an **html.ejs** file inside the folder (substituting .ejs for your template engine).  You may also add an optional `text.ejs` file; if none is provided, Nodemailer will attempt to create a text version of the email based on the html version.

### Example

Given the following **html.ejs** file contained in the folder **views/emailTemplates/testEmail**:

```
<p>Dear <%=recipientName%>,</p>
<br/>
<p><em>Thank you</em> for being a friend.</p>
<p>Love,<br/><%=senderName%></p>
```

executing the following command (after [configuring for your email service](https://github.com/CaliStyle/humpback-email-hook/#configuration) and turning off test mode) :

```
sails.hooks.email.send(
  "testEmail",
  {
    recipientName: "Joe",
    senderName: "Sue"
  },
  {
    to: "joe@example.com",
    subject: "Hi there"
  },
  function(err) {console.log(err || "It worked!");}
)
```

will result in the following email being sent to `joe@example.com`

> Dear Joe,
>
> *Thank you* for being a friend.
>
> Love,
>
> Sue

with an error being printed to the console if one occurred, otherwise "It worked!".  

