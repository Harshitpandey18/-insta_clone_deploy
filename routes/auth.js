const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model("User");
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/key.js');
const requiredLogin = require('../middleware/requireLogin');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { SENDGRID_API, EMAIL } = require('../config/key');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: SENDGRID_API
  }
}));

// Signup Route
router.post('/signup', (req, res) => {
  const { name, email, password, pic, bio } = req.body;
  if (!email || !password || !name) {
    return res.status(422).json({ error: "Please add all the fields" });
  }

  User.findOne({ email })
    .then((savedUser) => {
      if (savedUser) {
        return res.status(422).json({ error: "User already exists with that email" });
      }

      bcrypt.hash(password, 12)
        .then(hashedPassword => {
          const user = new User({
            email,
            password: hashedPassword,
            name,
            pic,
            bio
          });

          user.save()
            .then(user => {
              transporter.sendMail({
                to: user.email,
                from: "harshitpandey1803@gmail.com",
                subject: "Signed Up Successfully",
                html: `
                  <p>Thank you for signing up for My Insta :)</p>
                  <h5>We're glad to have you here with us.</h5>
                `
              });
              res.json({ message: "Signed-Up Successfully" });
            })
            .catch(err => {
              console.error("Signup save error:", err);
              res.status(500).json({ error: "Failed to create user" });
            });
        })
        .catch(err => {
          console.error("Password hashing error:", err);
          res.status(500).json({ error: "Something went wrong" });
        });
    })
    .catch(err => {
      console.error("Signup DB error:", err);
      res.status(500).json({ error: "Database error" });
    });
});

// Signin Route
router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ error: "Please add email or password" });
  }

  User.findOne({ email })
    .then(savedUser => {
      if (!savedUser) {
        return res.status(422).json({ error: "Invalid Email or password" });
      }

      bcrypt.compare(password, savedUser.password)
        .then(doMatch => {
          if (doMatch) {
            const token = jwt.sign({ _id: savedUser._id }, JWT_SECRET);
            const { _id, name, email, followers, following, pic } = savedUser;
            return res.json({ token, user: { _id, name, email, followers, following, pic } });
          } else {
            return res.status(422).json({ error: "Invalid Email or password" });
          }
        })
        .catch(err => {
          console.error("Signin bcrypt error:", err);
          return res.status(500).json({ error: "Internal error" });
        });
    })
    .catch(err => {
      console.error("Signin DB error:", err);
      return res.status(500).json({ error: "Something went wrong" });
    });
});

// Reset Password Route
router.post('/reset-password', (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.error("Token generation error:", err);
      return res.status(500).json({ error: "Failed to generate token" });
    }

    const token = buffer.toString("hex");

    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          return res.status(422).json({ error: "User doesn't exist with that email" });
        }

        user.resetToken = token;
        user.expireToken = Date.now() + 3600000;

        user.save().then(() => {
          transporter.sendMail({
            to: user.email,
            from: "harshitpandey180@gmail.com",
            subject: "Password Reset",
            html: `
              <p>You requested a password reset</p>
              <h5>Click this <a href="http://${req.headers.host}/reset/${token}">link</a> to reset your password</h5>
            `
          });

          res.json({ message: "Check your email" });
        });
      })
      .catch(err => {
        console.error("Reset password error:", err);
        res.status(500).json({ error: "Internal server error" });
      });
  });
});

// New Password Route
router.post('/new-password', (req, res) => {
  const newPassword = req.body.password;
  const sentToken = req.body.token;

  User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        return res.status(422).json({ error: "Session expired. Try again." });
      }

      bcrypt.hash(newPassword, 12)
        .then(hashedPassword => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.expireToken = undefined;

          user.save().then(() => {
            res.json({ message: "Password updated successfully" });
          });
        })
        .catch(err => {
          console.error("Password update error:", err);
          res.status(500).json({ error: "Failed to update password" });
        });
    })
    .catch(err => {
      console.error("Find user for new password error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
});

module.exports = router;
