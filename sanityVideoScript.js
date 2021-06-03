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

async function getYoutubeData() {
  return await youtube.search.list({
    channelId: channelId,
    part: "id, snippet",
    order: "date",
    maxResults: 50,
  });
}

async function mutation(item) {
  //Make a query to check if video exists
  let check = await client
    .fetch(`*[_type == "video" && video == "${item.id.videoId}"]`)
    // .then((data) => console.log(data))
    .catch(console.error);

  //if doesnt exist then create an entry
  if (!check.length) {
    const mutations = [
      {
        createOrReplace: {
          _type: "video",
          video: item.id.videoId,
          time: item.snippet.publishTime,
          title: item.snippet.title,
          image: item.snippet.thumbnails.medium.url,
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
  }
}

async function deleteDocument(type) {
  const mutations = [
    {
      delete: {
        query: `*[_type == '${type}']`,
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
}

async function runSscript() {
  // let youtubeData = await getYoutubeData();

  // //using map instead of for each because foreach doesnt work well with promises
  // youtubeData.data.items.map((item) => {
  //   console.log(item.snippet.thumbnails);
  //   mutation(item);
  // });
  await deleteDocument("comment");
}

if (module === require.main) {
  runSscript().catch(console.error);
}
module.exports = runSscript;
