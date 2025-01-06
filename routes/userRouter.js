const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const occupationRouter = require('../controllers/occupation.js');
const videosRouter = require('../controllers/videospath.js');
const formCount = require('../controllers/form-submissions.js');
const formPosts = require('../controllers/form-post.js');

// route GET users
router.get('/users/:id', userController.getUserById);



// route POST users
router.post('/login', userController.loginUser);
router.post('/register', userController.createUser);
router.post('/form-submissions', formPosts.formPost);

router.get('/form-submission-counts', formCount.formsubmissions);
router.get('/videospath', videosRouter.getAllVideos);
router.get('/occupation', occupationRouter.getAllOccupation);
router.get('/question/:id', occupationRouter.getQuestionByOccupation);

module.exports = router;