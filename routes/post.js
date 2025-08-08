const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const requireLogin = require('../middleware/requireLogin');
const Post = mongoose.model('Post');

// Get all posts
router.get('/allpost', requireLogin, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('postedBy', '_id name')
      .populate('comments.postedBy', '_id name')
      .sort('-createdAt');
    res.json({ posts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get posts by following users
router.get('/getsubpost', requireLogin, async (req, res) => {
  try {
    const posts = await Post.find({ postedBy: { $in: req.user.following } })
      .populate('postedBy', '_id name')
      .populate('comments.postedBy', '_id name')
      .sort('-createdAt');
    res.json({ posts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Create a new post
router.post('/createpost', requireLogin, async (req, res) => {
  const { title, body, pic } = req.body;
  if (!title || !body || !pic) {
    return res.status(422).json({ error: 'Please add all the fields' });
  }

  req.user.password = undefined;

  try {
    const post = new Post({
      title,
      body,
      photo: pic,
      postedBy: req.user,
    });

    const result = await post.save();
    res.json({ post: result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get user's own posts
router.get('/mypost', requireLogin, async (req, res) => {
  try {
    const posts = await Post.find({ postedBy: req.user._id })
      .populate('postedBy', '_id name');
    res.json({ mypost: posts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to fetch your posts' });
  }
});

// Like a post
router.put('/like', requireLogin, async (req, res) => {
  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $push: { likes: req.user._id },
      },
      { new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: 'Failed to like post' });
  }
});

// Unlike a post
router.put('/unlike', requireLogin, async (req, res) => {
  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $pull: { likes: req.user._id },
      },
      { new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: 'Failed to unlike post' });
  }
});

// Comment on a post
router.put('/comment', requireLogin, async (req, res) => {
  const comment = {
    text: req.body.text,
    postedBy: req.user._id,
  };

  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $push: { comments: comment },
      },
      { new: true }
    )
      .populate('comments.postedBy', '_id name')
      .populate('postedBy', '_id name');

    res.json(result);
  } catch (err) {
    res.status(422).json({ error: 'Failed to comment' });
  }
});

// Delete a post
router.delete('/deletepost/:postId', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Post.findByIdAndDelete(post._id);

    res.json({ message: 'Successfully deleted', _id: post._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
