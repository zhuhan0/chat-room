'use strict';

let giphy = require('giphy-api')();
let express = require('express');
let router = express.Router();

router.get('/test', (req, res) => {
  return res.send('Test route');
});

router.get('/giphy/:fmt/:search', (req, res) => {
  console.log(`Giphy search for term ${req.params.search}`);

  giphy.random({
    tag: req.params.search,
    rating: 'g',
    fmt: req.params.fmt
  }, (err, result) => {
    if (err) {
      res.status(err.status || 500);
      res.render('error', {
        errorMessage: err.message,
        error: err
      });
    }

    res.send(result);
  });
});

module.exports = router;
