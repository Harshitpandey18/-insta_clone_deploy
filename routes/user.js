const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const requireLogin = require('../middleware/requireLogin');
const Post = mongoose.model("Post");
const User = mongoose.model("User");

// Get user profile and their posts
router.get('/user/:id', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ postedBy: req.params.id })
      .populate("postedBy", "_id name");

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow a user
router.put('/follow', requireLogin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body.followId, {
      $addToSet: { followers: req.user._id }
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { following: req.body.followId }
    }, { new: true }).select("-password");

    res.json(updatedUser);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

// Unfollow a user
router.put('/unfollow', requireLogin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body.unfollowId, {
      $pull: { followers: req.user._id }
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      $pull: { following: req.body.unfollowId }
    }, { new: true }).select("-password");

    res.json(updatedUser);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

// Update profile picture
router.put('/updatepic', requireLogin, async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { pic: req.body.pic } },
      { new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: "Failed to update profile picture" });
  }
});

// ✅ Fixed: Search users by email
router.post('/search-users', async (req, res) => {
  try {
    const userPattern = new RegExp("^" + req.body.query, "i"); // case-insensitive
    const users = await User.find({ email: { $regex: userPattern } })
      .select("_id email pic"); // include pic for search modal
    res.json({ user: users }); // ✅ Changed key from "users" to "user"
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
