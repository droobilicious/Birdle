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
  gameConfig.epochDate = new Date( gameConfig.epoch.split(' ')[0] ); 

  //Get client time offset
  gameConfig.clientTimeOffset = 0; 

  const { searchParams } = new URL(req.url)
  if ( searchParams.has('clientTimeOffset') )
  {
    gameConfig.clientTimeOffset = searchParams.get('clientTimeOffset')
  }


  //get UTC and client timestamp
  gameConfig.UTCTimeStamp = new Date().getTime(); 
  gameConfig.ClientTimeStamp =  gameConfig.UTCTimeStamp - (gameConfig.clientTimeOffset * 60 * 1000);
  
  //How many days since epoch for UTC date
  let UTCDifference = gameConfig.UTCTimeStamp  - gameConfig.epochDate.getTime();
  gameConfig.DaysSinceEpochUTC = Math.floor(UTCDifference / (1000 * 3600 * 24));

  let LocalDifference = gameConfig.ClientTimeStamp - gameConfig.epochDate.getTime();
  gameConfig.DaysSinceEpochLocal = Math.floor(LocalDifference / (1000 * 3600 * 24));

  //Limit days since Epoch to UTC +/- 1
  let maxDaysAllowed = gameConfig.DaysSinceEpochUTC +1;
  let minDaysAllowed = gameConfig.DaysSinceEpochUTC -1;
  gameConfig.DaysSinceEpochLocal = Math.min(Math.max( gameConfig.DaysSinceEpochLocal ,minDaysAllowed), maxDaysAllowed)

  
  //get game number
  gameConfig.gameNumber = gameConfig.DaysSinceEpochLocal +1;
  gameConfig.keyNumber = (gameConfig.DaysSinceEpochLocal % gameConfig.gameCount) + 1;
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