import { TwitterClient } from "twitter-api-client";
import { twoot } from "twoot";
import { close as flushSentry } from "@sentry/node";

import {
  MASTODON_SERVER,
  MASTODON_TOKEN,
  TWITTER_ACCESS_KEY,
  TWITTER_ACCESS_SECRET,
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
} from "./env";

/**
 * the number of tweets that should be considered in the window of tweets to
 * crosspost for each user.
 */
const MAX_TL_LENGTH = 50;

/**
 * id representing a cutoff date -- tweets before this won't be included in
 * results or considered for crossposting. generate with something like
 * `node -e "console.log(Date.now())"`.
 */
const SINCE = "1685577144665";

const argv = process.argv.slice(2);

// ok for future reference using this twitter-api-client package is a very bad
// idea... a significant proportion of its typings are simply incorrect, and it
// throws non-Error objects when something goes wrong (so stack traces are lost
// and it's impossible to tell where in your code something actually threw).
// avoid.
function getEnsuredError(err: any, extraContext?: any) {
  if (err instanceof Error) return err;
  return new Error(
    `Non-Error error (probably from the perfidious twitter-api-client):\n${JSON.stringify(
      err,
      undefined,
      2
    )}${
      extraContext
        ? `\n(extra context: ${JSON.stringify(extraContext, undefined, 2)})`
        : ""
    }`
  );
}

async function main() {
  const twitter = new TwitterClient({
    apiKey: TWITTER_CONSUMER_KEY,
    apiSecret: TWITTER_CONSUMER_SECRET,
    accessToken: TWITTER_ACCESS_KEY,
    accessTokenSecret: TWITTER_ACCESS_SECRET,
  });

  const self = await twitter.accountsAndUsers
    .accountVerifyCredentials({
      include_entities: false,
    })
    .catch((e) => {
      throw getEnsuredError(e);
    });

  const tweets = await twitter.tweets
    .statusesUserTimeline({
      user_id: self.id_str,
      since_id: SINCE,
      count: MAX_TL_LENGTH,
      trim_user: true,
      include_rts: true,
      // TODO: verify that this is what we want -- i think we need it to be
      // false to show replies to ourselves for threads, but might not want
      // replies to random users on twitter. for the intended use of this
      // particular tool this isn't a problem, though.
      exclude_replies: false,
    })
    .catch((e) => {
      throw getEnsuredError(e);
    });

  const toCrosspost: {
    // TODO
    tweetId: string;
    date: Date;
  }[] = [];

  for (const tweet of tweets) {
    if (!tweet.retweeted) {
      toCrosspost.push({
        // TODO
        tweetId: tweet.id_str,
        date: new Date(tweet.created_at),
      });
    }
  }

  // sort from oldest to newest.
  toCrosspost.sort((a, b) => a.date.valueOf() - b.date.valueOf());

  console.log("to crosspost:\n", toCrosspost);
  console.log("count:", toCrosspost.length);

  if (toCrosspost.length === 0) {
    console.log("nothing to retweet.");
    return;
  }

  if (argv.includes("dry-run")) {
    console.log("dry run, exiting.");
    return;
  }

  for (const { tweetId, date } of toCrosspost) {
    console.log(
      `crossposting https://twitter.com/anyone/status/${tweetId} (posted ${date})`
    );

    // TODO: toot via twoot
  }
}

void main()
  .then(() => flushSentry(2000))
  .then(() => {
    console.log("done.");
    process.exit(0);
  });
