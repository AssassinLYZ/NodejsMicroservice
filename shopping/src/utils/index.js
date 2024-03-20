const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const axios = require("axios");
const amqplib = require("amqplib");
const {
  APP_SECRET,
  SHOPPING_BINDING_KEY,
  BASE_URL,
  EXCHANGE_NAME,
  MSG_BROKER_URL,
  QUEUE_NAME,
} = require("../config");
//Utility functions
module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
};

module.exports.GeneratePassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

module.exports.GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports.ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    console.log(signature);
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports.FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};

//Raise Events
// module.exports.PublishCustomerEvent = async (payload) => {
//   axios.post("http://localhost:8001/app-events/", {
//     payload,
//   });

//   //     axios.post(`${BASE_URL}/customer/app-events/`,{
//   //         payload
//   //     });
// };

module.exports.CreateChannel = async () => {
  console.log(MSG_BROKER_URL);
  try {
    const connection = await amqplib.connect(MSG_BROKER_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "direct", false);
    return channel;
  } catch (err) {
    throw err;
  }
};

module.exports.PublishMessage = async (channel, binding_key, msg) => {
  try {
    await channel.publish(EXCHANGE_NAME, binding_key, Buffer.from(msg));
    console.log("Sent: ", msg);
  } catch (err) {
    console.log(err);
  }
};

module.exports.SubscribeMessage = async (channel, service) => {
  console.log(123);
  const appQueue = await channel.assertQueue(QUEUE_NAME);
  channel.bindQueue(appQueue.queue, EXCHANGE_NAME, SHOPPING_BINDING_KEY);

  channel.consume(appQueue.queue, (data) => {
    console.log("recieve data in shopping");
    console.log(data.content.toString());
    service.SubscribeEvents(data.content.toString());
    channel.ack(data);
  });
};
