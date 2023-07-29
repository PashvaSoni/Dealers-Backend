import mongoose from "mongoose";
import dotenv from "dotenv";
import { compareHash, generateHash } from "../utils/helperFunctions.js";
import { signJWT } from "../utils/create-verify-JWT.js";
import accountSchema from "./accountDB.js";

dotenv.config();

//create new user
export const createUser = async (req, res) => {
  try {
      let hash = await generateHash(req.body.password);
      req.body.password = hash;
      const tempUser = new accountSchema(req.body);
      const newUser = await tempUser.save()
      res.status(200).json({ success: 1, message: "User Created Successfully.", data: newUser });
  }
  catch (err) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
          return res.status(406).json({ success: 0, message: "User is already registered." });
      }
      else {
          return res.status(500).json({ success: 0, message: err.message, data: null });
      }
  }
}


export const loginUser = async (req, res) => {
  try {
      const { phonenumber, password } = req.body;
      const validUser = await accountSchema.findOne({ phonenumber: phonenumber }).select({ email: 1, phonenumber: 1, password: 1, name: 1 });
      if (validUser != null) {
          const check = await compareHash(password, validUser.password);
          if (check) {
              const payload = {
                  id: validUser._id,
                  phonenumber:phonenumber,
                  name:validUser.name
                  //enter more details has per you requirements in future
              }
              const accessToken = await signJWT(payload, process.env.JWT_ACCESSTOKEN_KEY, 18000) // access token is valid for 30 mins
              const refreshToken = await signJWT(payload, process.env.JWT_REFRESHTOKEN_KEY, '7d') // refresh token are valid for 7 days
              //accessToken
              // res.cookie(`act`, `${accessToken}`, {
              //     maxAge: 18000, // access token is valid for 30 mins only
              //     secure: true, // so that cookies are sent only if domain is HTTPS
              //     httpOnly: true, // so that JS cannot access it 
              //     sameSite: true, // so that cookies are sent to our domain only
              // })
              //refreshToken
              res.cookie(`rct`, `${refreshToken}`, {
                  expires: new Date(new Date().getTime() + (7 * 24 * 60 * 60 * 1000)), // refresh token is valid for 7 days only
                  secure: true, // so that cookies are sent only if domain is HTTPS
                  httpOnly: true, // so that JS cannot access it 
                  sameSite: true, // so that cookies are sent to our domain only
              })

              res.status(200).json({ success: 1, message: "User Authenticated", data: {token:accessToken,userinfo:payload} });
          }
          else {
              return res.status(401).json({ success: 0, message: "Wrong or no authentication username/password provided.", data: null });
          }
      }
      else {
          return res.status(401).json({ success: 0, message: "Wrong or no authentication username/password provided.", data: null });
      }
  }
  catch (err) {
      return res.status(500).json({ success: 0, message: err.message, data: null });
  }
}