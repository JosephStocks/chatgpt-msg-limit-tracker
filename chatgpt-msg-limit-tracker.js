// ==UserScript==
// @name         detect chatgpt post request
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Load the message log from localStorage or initialize an empty array
  let messageLog = JSON.parse(localStorage.getItem("messageLog")) || [];

  // Save the message log to localStorage
  function saveMessageLog() {
    localStorage.setItem("messageLog", JSON.stringify(messageLog));
  }

  // Update message counter
  function updateMessageCounter() {
    messageCounter.innerText = `Message count: ${messageLog.length}`;
  }

  function ejectOldMessages() {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    messageLog = messageLog.filter(
      (message) => message.timestamp >= threeHoursAgo
    );
    saveMessageLog();
    updateMessageCounter();
  }

  async function parseBodyData(body) {
    if (body instanceof FormData) {
      return Object.fromEntries(body.entries());
    } else if (typeof body === "string") {
      return JSON.parse(body);
    } else {
      return body.json();
    }
  }

  function getGPTModelString() {
    return document.querySelector(
      "main > div.flex-1.overflow-hidden > div > div > div > div.flex.w-full.items-center.justify-center.gap-1.border-b.border-black\\/10.bg-gray-50.p-3.text-gray-500.dark\\:border-gray-900\\/50.dark\\:bg-gray-700.dark\\:text-gray-300"
    ).textContent;
  }

  // Create and style a text box for the message count
  const messageCounter = document.createElement("div");
  messageCounter.id = "messageCounter";
  messageCounter.style.position = "fixed";
  messageCounter.style.top = "10px";
  messageCounter.style.right = "10px";
  messageCounter.style.backgroundColor = "#fff";
  messageCounter.style.color = "#000";
  messageCounter.style.border = "1px solid #ccc";
  messageCounter.style.padding = "5px 10px";
  messageCounter.style.borderRadius = "5px";
  messageCounter.style.fontFamily = "Arial, sans-serif";
  messageCounter.style.fontSize = "14px";
  messageCounter.style.zIndex = "9999";
  messageCounter.innerText = "Message count: 0";
  document.body.appendChild(messageCounter);

  // Function to intercept and log fetch POST requests
  function interceptFetch(fetch) {
    return async function (url, init) {
      if (
        typeof url === "string" &&
        url.includes("https://chat.openai.com/backend-api/conversation") &&
        init &&
        init.method &&
        init.method.toUpperCase() === "POST" &&
        getGPTModelString().includes("GPT-4")
      ) {
        if (init.body) {
          const bodyData = await parseBodyData(init.body);

          const timestamp = Date.now();
          messageLog.push({
            messages: bodyData.messages[0].content.parts,
            timestamp,
          });
          saveMessageLog();
          console.log(
            "POST conversation fetch request message logged with timestamp:",
            bodyData,
            bodyData.messages[0].content.parts
          );

          // Eject messages older than 3 hours
          ejectOldMessages();
        }
      }
      return fetch.apply(this, arguments);
    };
  }

  // Override the global fetch function
  window.fetch = interceptFetch(window.fetch);

  // Periodically eject messages older than 3 hours every 60 seconds
  setInterval(ejectOldMessages, 60 * 1000);

  // Update the message counter with the initial message count from localStorage
  updateMessageCounter();

  console.log(
    "OpenAI Chat Conversation Fetch POST Detector with Persistent Message Log and UI Counter active."
  );
})();
