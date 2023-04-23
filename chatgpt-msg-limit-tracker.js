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

(async function () {
  "use strict";

  const MESSAGE_LOG_KEY = "messageLog";
  const EJECTION_INTERVAL = 60 * 1000; // 60 seconds
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  const GPT_VERSION = "GPT-4";

  // Load the message log from localStorage or initialize an empty array
  let messageLog = JSON.parse(localStorage.getItem(MESSAGE_LOG_KEY)) || [];

  // Save the message log to localStorage
  function saveMessageLog() {
    localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify(messageLog));
  }

  // Update message counter
  function updateMessageCounter() {
    messageCounter.textContent = `${GPT_VERSION} message count: ${messageLog.length}`;
  }

  function ejectOldMessages() {
    const threeHoursAgo = Date.now() - THREE_HOURS;
    messageLog = messageLog.filter(
      (message) => message.timestamp >= threeHoursAgo
    );
    saveMessageLog();
    updateMessageCounter();
    displayMessageLog();
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
    const startElement = document.querySelector(
      "#headlessui-listbox-button-\\:r0\\: > span.inline-flex.w-full.truncate"
    );
    if (startElement) {
      return startElement.textContent;
    }
    const modelElement = document.querySelector(
      "main > div.flex-1.overflow-hidden > div > div > div >" +
        " div.flex.w-full.items-center.justify-center.gap-1." +
        "border-b.border-black\\/10.bg-gray-50.p-3.text-gray-500" +
        ".dark\\:border-gray-900\\/50.dark\\:bg-gray-700.dark\\:text-gray-300"
    );
    return modelElement ? modelElement.textContent : "";
  }

  function buildTimeAgoString(timeDiffInMs) {
    const timeDiffSeconds = timeDiffInMs / 1000;
    if (timeDiffSeconds < 60) {
      return `${timeDiffSeconds.toFixed(1)} seconds ago`;
    } else if (timeDiffSeconds < 60 * 60) {
      return `${(timeDiffSeconds / 60).toFixed(1)} minutes ago`;
    } else {
      return `${(timeDiffSeconds / (60 * 60)).toFixed(1)} hours ago`;
    }
  }

  // Display all messages with how long ago they were asked
  function displayMessageLog() {
    const now = Date.now();
    const humanReadableMessageLog = messageLog.map(
      ({ message, timestamp }) => ({
        message,
        timeAgo: buildTimeAgoString(now - timestamp),
      })
    );
    console.log("humanReadableMessageLog", humanReadableMessageLog);
  }

  // Create and style a text box for the message count
  const messageCounter = document.createElement("div");
  messageCounter.id = "messageCounter";
  messageCounter.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;  
    background-color: #fff;
    color: #000;
    border: 1px solid #ccc;
    padding: 5px 10px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
  `;
  messageCounter.textContent = `${GPT_VERSION} message count: 0`;
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
        getGPTModelString().includes(GPT_VERSION)
      ) {
        if (init.body) {
          const bodyData = await parseBodyData(init.body);
          console.log("bodyData", bodyData);

          const timestamp = Date.now();
          messageLog.push({
            message: bodyData.messages[0].content.parts[0],
            timestamp,
          });
          saveMessageLog();
          console.log(
            "POST conversation fetch request message logged with timestamp:",
            messageLog
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
  setInterval(ejectOldMessages, EJECTION_INTERVAL);

  // Update the message counter with the initial message count from localStorage
  updateMessageCounter();
  displayMessageLog();

  console.log(
    "OpenAI Chat Conversation Fetch POST Detector with Persistent Message Log and UI Counter active."
  );
})();
