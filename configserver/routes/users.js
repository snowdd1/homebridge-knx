var express = require('express');
var router = express.Router();

/*
 * GET userlist.
 */
router.get('/userlist', function(req, res) {
    var myStorage = req.myStorage;
    var collection = myStorage.values();  // get all data from node-persist database
//    collection.find({},{},function(e,docs){
//        res.json(docs);
//    });
    res.json(collection);
});


/*
 * POST to adduser.
 */
router.post('/adduser', function(req, res) {
    var myStorage = req.myStorage;
    //var collection = db.get('userlist');
//    collection.insert(req.body, function(err, result){
//        res.send(
//            (err === null) ? { msg: '' } : { msg: err }
//        );
//    });
    
    // for node-persist, we need a unique id for the record, so we use the username:
    
    console.log(req.body.username);
    console.log(req.body);
    myStorage.setItem(req.body.username, req.body, function(err){
    	console.log("Added!");
    	res.send(
    		(err === null) ? { msg: '' } : { msg: err }
    	);
    })
});

/*
 * DELETE to deleteuser.
 */
router["delete"]('/deleteuser/:id', function(req, res) {
	console.log("in route delete");
	var myStorage = req.myStorage;
    //var collection = db.get('userlist');
    var userToDelete = req.params.id;
    myStorage.removeItem(userToDelete, function(err){
    	console.log("Removed!" + err);
    	res.send((err === null) ? { msg: '' } : { msg:'error: ' + err });
    })
//    collection.remove({ '_id' : userToDelete }, function(err) {
//        res.send((err === null) ? { msg: '' } : { msg:'error: ' + err });
//    });
});

module.exports = router;
