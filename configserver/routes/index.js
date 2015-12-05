var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
/* GET home page. */
router.get('/device', function(req, res, next) {
  res.render('formdevice', { title: 'KNX Device Form' });
});

module.exports = router;
