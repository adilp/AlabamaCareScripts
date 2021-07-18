"use strict";

const { google } = require("googleapis");
const fetch = require("node-fetch");
const moment = require("moment");

const sanityClient = require("@sanity/client");

const client = sanityClient({
  projectId: "aw80b2ut",
  dataset: "production",
});

// initialize the Youtube API library
const youtube = google.youtube({
  version: "v3",
  auth: "AIzaSyDwzOA_w0cgZl1GfEluvTHzVVZyRn6breE",
});

const channelId = "UCelln8w51Z5AZ6y6kUR8tEw";
const projectId = "aw80b2ut";
const datasetName = "production";
const tokenWithWriteAccess =
  "skgpZMsCKw7YFrqbexdhdgSeSEFLxNL8qb9BXmfmzoo1KJGH6jsuZ8CtEGUiVMh7LnyjLB8vGw28howrvicv58dBfKVBXoMO5TiWFGI8dUacFuVcXqp5CEyUMjAk61f72MbTDmy0VF6BXhNdmDupUbUEHub37HVrhxqyFPbRyrqtUkoEfOew";

const timeRegex = /(?<!\S)(?:(?:(\d{1,2}):)?([0-5]?\d):)?([0-5]?\d)(?!\S)/gm;
const hashTagRegex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm;

async function getYoutubeData(item) {
  return await youtube.commentThreads.list({
    part: "id,snippet",
    maxResults: 100,
    videoId: item,
    order: "relevance",
  });
}

async function mutation(item) {
  //Make a query to check if video exists
  let check = await client
    .fetch(`*[_type == "comment" && orginalText == "${item.orginalText}"]`)
    .catch(console.error);

  //if doesnt exist then create an entry
  if (check.length == 0) {
    console.log("doesnt exist", check);
    const mutations = [
      {
        create: {
          _type: "comment",
          video: item.video,
          videoId: {
            _type: "reference",
            _ref: item.videoId,
          },
          orginalText: item.orginalText,
          text: item.text,
          timeStamp: item.timeStamp,
          hashtag: item.hashtag,
          likes: item.likes,
          commentAuthor: item.commentAuthor,
          url: item.url,
          image: item.image,
          upvote: 0,
        },
      },
    ];

    fetch(`https://${projectId}.api.sanity.io/v1/data/mutate/${datasetName}`, {
      method: "post",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${tokenWithWriteAccess}`,
      },
      body: JSON.stringify({ mutations }),
    })
      .then((response) => response.json())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  } else {
    console.log("exists");
  }
}

function extractRegex(inputText, regex) {
  var matches = [];
  var match;

  while ((match = regex.exec(inputText))) {
    // console.log(match);
    matches.push(match[0]);
  }

  return matches;
}

function getTitleOnly(str, arr) {
  let regex = new RegExp("\\b" + arr.join("|") + "\\b", "gi");
  return str.replace(regex, "");
}

function cleanText(inputText) {
  let time = extractRegex(inputText, timeRegex);
  let hashtag = extractRegex(inputText, hashTagRegex);
  let title = getTitleOnly(inputText, [time, hashtag]);

  return title.toString().trim();
}

function pushComments(comments) {
  if (comments) {
    comments.forEach((element) => {
      let commentsSplit = element.comment.split("\n");
      commentsSplit.forEach((singleComment, i) => {
        setTimeout(() => {
          //set timeout to by pass rate limiting
          if (singleComment.includes(":")) {
            let timeStamp = "";
            let text = "";
            let url = "";
            let hashtag = extractRegex(
              singleComment.trim(),
              hashTagRegex
            ).toString();
            let tStamp = extractRegex(
              singleComment.trim(),
              timeRegex
            ).toString();
            let timeStampSplit = tStamp.split(":");
            if (timeStampSplit.length === 3) {
              url =
                "https://www.youtube.com/watch?v=" +
                element.video +
                "&t=" +
                timeStampSplit[0] +
                "h" +
                timeStampSplit[1] +
                "m" +
                timeStampSplit[2] +
                "s";
            } else {
              url =
                "https://www.youtube.com/watch?v=" +
                element.video +
                "&t=" +
                timeStampSplit[0] +
                "m" +
                timeStampSplit[1] +
                "s";
            }

            let mutationObject = {
              orginalText: singleComment,
              video: element.video,
              videoId: element.videoId,
              text: cleanText(singleComment),
              likes: element.likes,
              timeStamp: tStamp,
              commentAuthor: element.commentAuthor,
              hashtag: hashtag,
              image: element.image,
              url: url,
            };
            mutation(mutationObject);
          }
        }, i * 6000);
      });
    });
  }
}

async function runSscript() {
  let comments = [];
  let check = await client.fetch(`*[_type == "video"]`).catch(console.error);

  let citiesForecasts = [];
  check.map((city) => citiesForecasts.push(getYoutubeData(city.video)));

  Promise.all(citiesForecasts)
    .then((results) => {
      results.map((test) => {
        if (test.data.items) {
          test.data.items.map((item) => {
            comments.push({
              comment: item.snippet.topLevelComment.snippet.textOriginal,
              likes: item.snippet.topLevelComment.snippet.likeCount,
              image: check.find(
                (id) => id.video == item.snippet.topLevelComment.snippet.videoId
              ).image,
              videoId: check.find(
                (id) => id.video == item.snippet.topLevelComment.snippet.videoId
              )._id,
              video: item.snippet.topLevelComment.snippet.videoId,
              commentAuthor:
                item.snippet.topLevelComment.snippet.authorDisplayName,
            });
          });
        }
      });
      return comments;
    })
    .then((comments) => {
      pushComments(comments);
    })
    .catch((err) => {
      console.log(err);
    });
}

if (module === require.main) {
  runSscript().catch(console.error);
}
module.exports = runSscript;
