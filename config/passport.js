const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../models/userSchema");
require("dotenv").config();  // Ensure dotenv is loaded

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,  // Corrected variable name
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,  // Corrected variable name
  callbackURL: 'https://cuteepaws.aleena.fun/auth/google/callback'  // Make sure this URL matches your Google Developer Console redirect URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
      // If the user already exists, return the user object
      return done(null, user);
    } else {
      // If the user does not exist, create a new user
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,  // Correct access to email
        googleId: profile.id
      });
      await user.save();
      return done(null, user);
    }
  } catch (error) {
    console.error(error);
    return done(error, null);
  }
}));

// Serialize user to store user ID in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user to fetch user details from the session
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

module.exports = passport;
