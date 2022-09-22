import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})




/*
Get basic game info, game number, key number etc
*/
function getGameInfo(req, epoch){

  let gameConfig = {
    gameCount : 331 // total number of games that are stored
  }

  //get Epoch timestamp
  gameConfig.epoch = epoch;
  gameConfig.epochTimestamp = Date.parse( gameConfig.epoch ) /1000;


  //Get timeoffset from client (or use our own)
  gameConfig.clientTimeOffset = 0;
  if (typeof req != 'undefined') {
    if (req.method === 'POST') {
      if ('clientTimeOffset' in req.body){
        gameConfig.clientTimeOffset = parseInt(req.body.clientTimeOffset);
      }
    }
  }

  //Limit Offset
  gameConfig.offsetToUse = 0;
  if (Number.isInteger(gameConfig.clientTimeOffset)){
    let maxFowardOffset = (14*60);
    let maxBackOffset = (12*-60);
    gameConfig.offsetToUse = Math.min(Math.max( parseInt(gameConfig.clientTimeOffset),maxBackOffset), maxFowardOffset)
  }
  
  //get UTC and client timestamp
  gameConfig.UTCTimeStamp = Math.floor(new Date().getTime() / 1000); //(new Date().getTimezoneOffset() *60);
  gameConfig.clientTimestamp = gameConfig.UTCTimeStamp - (gameConfig.offsetToUse * 60);
  
  //cal days difference (i.e. game number)
  gameConfig.daysSinceEpoch = Math.floor( (gameConfig.clientTimestamp - gameConfig.epochTimestamp) / (24*60*60));
  gameConfig.secondsSinceStartOfDay = (gameConfig.clientTimestamp - gameConfig.epochTimestamp) %  (24*60*60);
  gameConfig.secondsToNextGame = (24*60*60) - gameConfig.secondsSinceStartOfDay;
  //let timeToNextGame = secondsToString(secondsToNextGame);


  //get game number
  //const gameNumber = Math.floor((Math.random() * 649) + 1);;
  gameConfig.gameNumber = gameConfig.daysSinceEpoch +1;
  gameConfig.keyNumber = (gameConfig.daysSinceEpoch % gameConfig.gameCount) + 1;
  gameConfig.keyName = "game_" + gameConfig.keyNumber;

  return gameConfig;

}



/*
display the basic game info
*/
async function showGameInfo(req){

  let epoch = await gamedata_1.get("epoch");
  let gameInfo = getGameInfo(req, epoch);  
  let gameInfoJSON = JSON.stringify(gameInfo);

  return new Response(gameInfoJSON, {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  })
}


/*
Load the game data
*/
async function getGameConfig(req){

  let epoch = await gamedata_1.get("epoch");
  let gameInfo = getGameInfo(req, epoch);  

  //get game data
  console.log("Keyname: " + gameInfo.keyName)
  const gameData = await gamedata_1.get(gameInfo.keyName);
  const gameDataParsed = JSON.parse(gameData);

  //augment game data
  gameDataParsed.id = gameInfo.gameNumber;


  //obfuscate


  //prepare for output
  let gameDataJSON = JSON.stringify(gameDataParsed);

  return new Response(gameDataJSON, {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
      })


}




async function handleEvent(event) {
  const { request } = event;
  const { url } = request;
  const { pathname } = new URL(event.request.url);

  let options = {}

  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`
   */
  // options.mapRequestToAsset = handlePrefix(/^\/docs/)

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true,
      };
    }

    console.log("--------------------------------------");
    console.log("url: " + url);
    console.log("pathname: " + pathname);
    console.log("request url: " + event.request.url);
    console.log("request destination: " + event.request.destination);
    console.log("request method: " + event.request.method);
    

    let page = null;
    

    if (pathname === '/config') {
      return getGameConfig(request);
    } 
    else if (pathname === '/gameinfo') {

      return showGameInfo(request);

    }
    else {
      page = await getAssetFromKV(event, options);
    }

    // allow headers to be altered
    const response = new Response(page.body, page);

    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "unsafe-url");
    response.headers.set("Feature-Policy", "none");

    return response;

  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req),
        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 })
  }
}

/**
 * Here's one example of how to modify a request to
 * remove a specific prefix, in this case `/docs` from
 * the url. This can be useful if you are deploying to a
 * route on a zone, or if you only want your static content
 * to exist at a specific path.
 */
function handlePrefix(prefix) {
  return request => {
    // compute the default (e.g. / -> index.html)
    let defaultAssetKey = mapRequestToAsset(request)
    let url = new URL(defaultAssetKey.url)

    // strip the prefix from the path for lookup
    url.pathname = url.pathname.replace(prefix, '/')

    // inherit all other props from the default request
    return new Request(url.toString(), defaultAssetKey)
  }
}