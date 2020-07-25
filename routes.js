const express = require('express');
const routes = new express.Router()
const indexController = require('./website/IndexController');

module.exports = routes;
routes.get('/', indexController.index);