'use strict';

//var assert = require('assert');
var request = require('supertest');
//var _ = require('lodash');

describe('Email Controller ::', function () {

  /*
  before(function (done) {
    request(sails.hooks.http.app)
      .post('/register')
      .send({
        email: 'me@mocha.test',
        password: 'admin123'
      })
      .expect(200)
      .end(function (err) {
        done(err);
      });
  });
  */
  

  describe('#send()', function () {

    it('should send an email', function (done) {

        request(sails.hooks.http.app)
          .post('/email/send')
          .send({
            recipientName: 'Joe',
            to: 'joe@example.com'
          })
          .expect(200)
          .end(function (err) {
            done(err);
          });
      });
  });

  describe('#show()', function () {

    it('should show an email', function (done) {

        request(sails.hooks.http.app)
          .get('/email/show')
          .expect(200)
          .end(function (err) {
            done(err);
          });
      });
  });



});