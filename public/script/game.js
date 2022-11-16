let debugMode = false;

if (debugMode === false){ 
    console.log = function() {}
}



/*

* arrow functions would preserve this scope below
* swith to ES6 class

*/


// Game code
var game = {
    gameConfig : null, //settings passed to the constructor
    gameData : null,   //data for this individual days game /config
    gameState : null,  //info about the game state, previous guesses, whether the game has been finished etc
    gameName : "Birdle",
    gameURL : "https://birdle.isnow.online",
    imageBasePath : "gameimages/",
    imageParts : null,
    tilesOnShortSide : 2,  
    tilesOnLongSide : 3, 
    columns : null,  //calculated
    rows : null, //calculated
    destinationBlockWidth : null, //calculated
    destinationBlocHeight : null, //calculated
    isPortrait : false, 
    stats : null,
    currentGuess : 0, 
    maxGuesses : 6,
    start : function(config){
        console.log("Running start()");
        let _this = this;
        this.gameConfig = config;

        //set initial button state
        $( this.gameConfig.guessButtonSelector).attr("disabled", true);

        //set button events
        $( this.gameConfig.guessButtonSelector ).click(function(){
            _this.submitGuess( $( _this.gameConfig.inputTxtSelector ).val() );
            $( _this.gameConfig.guessButtonSelector ).attr("disabled", true);
        });
        
        $( this.gameConfig.skipButtonSelector ).click(function(){
            _this.submitGuess( '' );
            $( _this.gameConfig.guessButtonSelector ).attr("disabled", true);
    
        }); 

        //load game data
        this.loadGameData().then(function(){
            
            _this.loadGameState();
            _this.saveGameState();
            _this.displayStats();
           
            //see if game was already finished
            if (_this.gameState.hasFinished === true){
                //the game was already completed
                
                //load the full image then show the completed page
                _this.loadImage( 
                    function(){
                        _this.showFinalImage();
                        _this.showCompletedPage();
                        _this.onComplete();
                    } );


            }
            //game was not finished partial game
            else{  
                
                //update guess button if this is the last guess
                _this.currentGuess = _this.gameState.guessList.length;
                if (_this.currentGuess >= _this.maxGuesses-1){
                    $( _this.gameConfig.skipButtonSelector ).val("Give Up");
                }

                //display image so far
                _this.loadImage( function(){ _this.revealImage() } );
                _this.displayGuesses();

            }
            

        });

    

    },
    // Load game configuration data (JSON)
    loadGameData : function(){
        console.log("Running getGameData");
        let _this = this;

        let clientDate = new Date();
        let clientDateOffset = clientDate.getTimezoneOffset() ;
      
       // console.log("clientDate:" + clientDate);

        return $.post( "/config",{ clientTimeOffset : clientDateOffset } )
                    .done(function(data) {
                        console.log( "Load completed" );
                        console.log("data: " + JSON.stringify(data));
                        _this.gameData = data;
                    })
                    .fail(function() {
                        console.log( "error" );
                    })
                    .always(function() {
                        console.log( "finished" );
                    });

    },
    loadGameState : function(){
        console.log("Running loadGameState");
        let _this = this;

        //get all game history from local storage
        let gameHistory = [];
        if (localStorage.getItem( this.gameConfig.localStorageName ) != null) {
            gameHistory = JSON.parse( localStorage.getItem( this.gameConfig.localStorageName ) );
        }

        //look for this particular game     
        let thisGame = gameHistory.filter(item => {
            return item.id == _this.gameData.id;
        });
        
        if (thisGame.length === 0){
            //no info for this game is stored so create some
            console.log("loadGameState: no game data for this game");
            thisGame = {
                id : this.gameData.id,
                hasStarted : false,
                guessList : [],
                hasFinished : false,
                hasWon : false,
                score : 'x',
                revealOrder : this.getRevealOrder()
            }
            
        }else{
            console.log("loadGameState: game data was found for this game");
            thisGame = thisGame[0];
        }


        this.gameState = thisGame;
        

    },
    saveGameState : function(){
        console.log("Running saveGameState");
        let _this = this;

        //get all game history
        let gameHistory = [];
        if (localStorage.getItem( this.gameConfig.localStorageName ) != null) {
            gameHistory = JSON.parse( localStorage.getItem( this.gameConfig.localStorageName ) );
        }

        const isThisGame = (element) => element.id == _this.gameData.id;

        let i = gameHistory.findIndex(isThisGame);

        console.log("Index found: " + i);

        if ( i == -1){
            gameHistory.push(this.gameState);
        }else{
            gameHistory[i] = this.gameState;
        }

        //store the updated gameHistory
        console.log("gameState: " + JSON.stringify(this.gameState));
        console.log("saving gameHistory: " + JSON.stringify(gameHistory));
        localStorage.setItem( this.gameConfig.localStorageName, JSON.stringify(gameHistory) );

    },
    loadImage : function(callback){
        console.log("Running loadImage")
        let _this = this;

        let FullImagePath = this.imageBasePath + this.gameData.image
        console.log("Loading image " +  FullImagePath)

        let tempImage= new Image() ;
        tempImage.src = FullImagePath;

        //set onload function
        tempImage.onload = function(){ 

            //check if portrait or landscape
            _this.isPortrait = (this.height > this.width);
            console.log("isPortrait: " +  _this.isPortrait );

            //calculdate tile numbers
            console.log("columns : " +   _this.cols  + " Rows: " + _this.rows );
            _this.cols = (_this.isPortrait) ? _this.tilesOnShortSide : _this.tilesOnLongSide;
            _this.rows = (_this.isPortrait) ? _this.tilesOnLongSide : _this.tilesOnShortSide;
            
            //calculate width of pieces
            //let maxwidth = 300 ;//this.width; //300;
           // let maxheight = maxwidth *  (this.height / this.width); // maintain asepect ratio

            let maxheight = 200;
            let maxwidth = maxheight *  (this.width / this.height); // maintain aspect ratio

            let sourceBlockWidth = this.width /  _this.cols ;
            let sourceBlockHeight = this.height / _this.rows ;

            _this.destinationBlockWidth = maxwidth / _this.cols ;
            _this.destinationBlocHeight = maxheight / _this.rows ;

            
            _this.imageParts = []
            
            //loop rows and columns
            for(let row = 0; row < _this.rows ; ++row) {
                for(let col = 0; col <  _this.cols ; ++col) {
                    let canvas = document.createElement('canvas');
                    canvas.width = _this.destinationBlockWidth;
                    canvas.height = _this.destinationBlocHeight;
                    let context = canvas.getContext('2d');
                    //draw image with offset
                    context.drawImage( tempImage, 
                                        col * sourceBlockWidth, row * sourceBlockHeight, //offset on source
                                        sourceBlockWidth, sourceBlockHeight, //width, height from source
                                        0, 0,  //offset on destination
                                        canvas.width, canvas.height //width, height, on destination
                                        );
                    _this.imageParts.push( canvas.toDataURL());
                }
            }


            
            console.log("imageParts count: " + _this.imageParts.length );
            console.log("Running callback");
            callback();
        }
    },
    getRevealOrder : function(){

        let n = 6
        let d = new Date();
        let seed = d.setHours(0, 0, 0, 0);
        let arr = [...Array(n).keys() ];
        return shuffle( arr, seed );


        function shuffle(array, seed) {               
            let copy = [], n = array.length, i;
            
            // While there remain elements to shuffle…
            while (n) {
              i = Math.floor(random(seed) * n--);  // Pick a remaining element…      
              copy.push(array.splice(i, 1)[0]);    // Move it to the new array.
              ++seed;
            }
          
            return copy;
          }
          
        
        function random(seed) {
          var x = Math.sin(seed++) * 10000; 
          return x - Math.floor(x);s
        }   


    },
    showFinalImage : function(){

        //reveal whole image
        let FullImagePath = this.imageBasePath + this.gameData.image
        $( this.gameConfig.ImageDivSelector )
               .empty()                      
               .removeAttr('style')
               .addClass('finalimage')
               .append(
                   $( "<img>" ).attr("src", FullImagePath)
               )

    },
    /*
        this function 
         -reveals all the currently revealed images if it's part way through
         -reveals the next image tile if a guess has been submitted

    */
    revealImage : function(){
        console.log("Running revealImage");
        let _this = this;

        console.log("guess number:" + this.currentGuess);
        console.log("imageParts count: " + this.imageParts.length );
        //console.log("imageParts count: " + this.imageParts[0]);

   
        //if the game image div is empty then setup the blank grid


        /*
            bit confusing this. refactor with just divs probs
        */
    

        
        //let revealOrder = this.getRevealOrder();
        let revealOrder = this.gameState.revealOrder;
        console.log("Reveal order: " + revealOrder.join(","));

        //set grid
        $(  this.gameConfig.ImageDivSelector ).css( {
            'display' : 'inline-grid',
            'grid-gap': '1px',
            'grid-template-columns' : 'repeat(' + this.cols + ', 1fr)'
        });


        //Reveal all images up to the current guess (unless they have already been revealed)
        for( let tile = 0; tile <  this.imageParts.length; ++tile){
        
          
            //the current tile is one that should be reveled
            if (revealOrder.slice(0, this.currentGuess).includes(tile)){
                console.log("RevealImage: tile ", tile, " should be revealed ");

                //Check if this tile has already been added to the grid
                if ($( this.gameConfig.ImageDivSelector ).children().eq(tile).length > 0)
                {
                    
                    console.log("RevealImage: tile ", tile, " has already been added to the grid");

                    //Check if the tile is currently the placeholder, so load the image
                    if ($( this.gameConfig.ImageDivSelector ).children().eq(tile).attr("src") !=  _this.imageParts[tile])
                    {
                        
                        console.log("RevealImage: tile ", tile, " is an image but is not set to the revealed image");
                        $( this.gameConfig.ImageDivSelector ).children().eq(tile)
                                .removeClass('hiddentile')
                                .addClass('showntile')
                                .attr("src", this.imageParts[tile]);


                        /*$( this.gameConfig.ImageDivSelector ).children().eq(tile).replaceWith(
                            $( "<img>" ).attr("src", this.imageParts[tile])    
                        );*/
                    }
                    

                }

                //tile hasnt yet been added into the grid so add it here with the revealed image
                else{
                    console.log("RevealImage: tile ", tile, "  has not yet been added to the grid. Adding");

                    $( "<img>" )
                        .attr("src",  this.imageParts[tile])
                        .appendTo(  _this.gameConfig.ImageDivSelector );
                }

            }

            //tiles that should not yet be revealed
            else{

                console.log("RevealImage: tile ", tile, "  has not yet been revealed.");

                if ($( this.gameConfig.ImageDivSelector ).children().eq(tile).length == 0)
                {
                    
                    console.log("RevealImage: tile ", tile, "  has not yet been revealed and doesnt exit, adding placeholder.");

                    $( "<img>" )
                        .addClass('hiddentile')
                        .css( {'width' : this.destinationBlockWidth, 'height' : this.destinationBlocHeight })
                        .appendTo( this.gameConfig.ImageDivSelector );
                }
                
            }


        }

        

        
                     



    },
    displayGuesses : function(){
        console.log("Running displayGuesses");
        
        $( this.gameConfig.guessListSelector).empty();

        for (let i=0;i<this.maxGuesses;i++){

            if (i < this.gameState.guessList.length){
                $('<div>')
                    .text(this.gameState.guessList[i].guess)
                    .addClass('guess')
                    .addClass('guess-bg-' + this.gameState.guessList[i].status )
                    .appendTo( this.gameConfig.guessListSelector );
            }
            else if (i == this.gameState.guessList.length){         
                $('<div>')
                    .addClass('guess')
                    .addClass('guess-active')
                    .appendTo( this.gameConfig.guessListSelector );
            }else{
                $('<div>')
                    .addClass('guess')
                    .appendTo( this.gameConfig.guessListSelector );
            }
        
        }

    },
    submitGuess : function(guess){
        console.log("Running submitGuess");
        let _this = this;

        console.log("Guess number " + (this.currentGuess+1) + ": " + guess);
        this.gameState.hasStarted = true;

        let thisGuess = {guess : guess, status : null }
        let newClass = null; 
        
        let displayText = guess;

        //check for partial guess
        let partiallyCorrect = false;
        let guessWords = guess.toUpperCase().match(/\b(\w+)\b/g);
        let answerWords = this.gameData.Name.toUpperCase().match(/\b(\w+)\b/g);
        let matchedWords = [];
        //Do any of the words in the guess appear in the actual answer
        //we'll start with just highlighting full words.  Maybe add more complexity later
        if (guessWords instanceof Array){
            matchedWords = guessWords.filter(x => answerWords.includes(x));
        }



        if (guess == '') //skipped
        {
            thisGuess.status = "skipped";
            newClass = 'guess-bg-skipped';
        }
        else if (guess.toUpperCase() == this.gameData.Name.toUpperCase()) //correct guess
        {
            thisGuess.status  = "correct";
            this.gameState.hasWon = true;
            this.gameState.score = this.currentGuess + 1;
            newClass = 'guess-bg-correct';

        }
        else if (matchedWords.length > 0 ) //partially correct guess (some words are correct)
        {
            thisGuess.status = "partcorrect";
            newClass = 'guess-bg-partcorrect';

            //highlight correct words

           /* let remainingText = guess.substr( this.gameData.Artist.length + 3, guess.length - (this.gameData.Artist.length + 3) );
            console.log("full len: " + this.gameData.FullTrackName.length);
            console.log("Remaining text: " + remainingText);
            displayText = "<span class='guess-partcorrect'>" + this.gameData.Artist + "</span> - "  + remainingText;
             */           

        }
        else{ //incorrect guess
            thisGuess.status  = "incorrect";
            newClass = 'guess-bg-incorrect';
        }

        //store the guess
        this.gameState.guessList.push(thisGuess);

        //color the guess
        $( ".guess" )
                .eq(this.currentGuess)
                .removeClass("guess-active")
                .addClass(newClass)
                .html(displayText);

        
        this.currentGuess++; //increment guess

        //is game over?
        if (this.gameState.hasWon == true ||  this.currentGuess >= this.maxGuesses)
        {
            console.log("Game is complete");
            this.gameState.hasFinished = true;
            
            this.saveGameState();
            this.showCompletedPage();
            this.showFinalImage(); 
            this.displayStats();
            this.onComplete(); 

        }else{

            this.saveGameState();

            //reveal a new square
            this.revealImage();
        

            //highlight next guess box
            $( ".guess" )
                .eq(this.currentGuess)
                .addClass('guess-active');

            
            //check if on last guess
            if (this.currentGuess >= this.maxGuesses-1){
                $('#btnSkipGuess').val("Give Up");
            }

            //clear the serch box
            $('#txtGuess').val('');

        }
        
    },
    onComplete : function(result){   

    },
    updateCountdown : function(element){
 
        const getCountdown = function()
        {
            var toDate=new Date();
            var tomorrow=new Date();
            tomorrow.setHours(24,0,0,0);
            var diffMS=tomorrow.getTime()/1000-toDate.getTime()/1000;
            var diffHr=Math.floor(diffMS/3600);
            diffMS=diffMS-diffHr*3600;
            var diffMi=Math.floor(diffMS/60);
            diffMS=diffMS-diffMi*60;
            var diffS=Math.floor(diffMS);
            var result=((diffHr<10)?"0"+diffHr:diffHr);
            result+=":"+((diffMi<10)?"0"+diffMi:diffMi);
            result+=":"+((diffS<10)?"0"+diffS:diffS);

            $( element).text( result );

        }

        getCountdown();
        setInterval(function(){ getCountdown(); }, 1000 );

    },
    getScoreSummary : function(unicode=false){
        console.log("Running getScoreSummary");
        let _this = this;

        let fullGuessList = this.gameState.guessList.map(item => item.status);
        for (let i=0;i< (this.maxGuesses - this.gameState.guessList.length );i++){
            fullGuessList.push( 'notused' );  
        }
        
        orderedGuessList = fullGuessList.map((num,index) => fullGuessList[ this.gameState.revealOrder.indexOf(index) ]  )
        
        //this.gameState.revealOrder.map((x) => fullGuessList[ x ]);

        console.log("getScoreSummary: fullGuessList: ", JSON.stringify(fullGuessList));
        console.log("getScoreSummary: orderedGuessList: ", JSON.stringify(orderedGuessList));
        console.log("getScoreSummary: rows/cols: ", this.rows + ", " +  this.cols);

        let output = null;

        if (unicode){

            output = orderedGuessList.map((item, index) => {

                item = item.replace('incorrect', '🟥')
                    .replace('partcorrect', '🟨')  //🟧     
                    .replace('correct', '🟩')
                    .replace('skipped', '⬛')
                    .replace('notused', '🟩'); //⬜  for this game not used is success
                
                if (((index+1) % _this.cols ) == 0 && index != orderedGuessList.length-1){
                    item = item + "\r\n";
                }   
                
                return item;
            }).join("");

            console.log("unicode", output);
        }else{

            output = $( '<div>' )
                    .addClass('score-wrapper')
                    .css( {
                        'display' : 'inline-grid',
                        'grid-gap': '1px',
                        'grid-template-columns' : 'repeat(' + this.cols + ', 1fr)'
                    });

            for(let i=0; i < orderedGuessList.length; ++i)
            {
            
                //    let newClass = "guess-bg-" + fullGuessList[ this.gameState.revealOrder[i] ];
                let newClass = "guess-bg-" + orderedGuessList[ i];
                console.log("Adding div with class ", newClass);
                $('<div>').addClass('scorebox').addClass(newClass).appendTo(output);    

    
            }
        
        }

        

        return output;
    },
    showCompletedPage : function(){
        console.log("Running showCompletedPage");
        
        $('.summary-gamenumber').text(this.gameName +  " #" + this.gameData.id);
        $('.summary-answer').empty().append(
            $("<a>", {
                title: this.gameData.URL,
                href: this.gameData.URL,
                target: '_blank'
                }).text(this.gameData.Name)
        );
            
        $('.summary-scoresummary').empty().append( this.getScoreSummary() );

        (this.gameState.hasWon === true) ? 
             $('.summary-message').text('Well done. You got it in ' + this.gameState.score) :
             $('.summary-message').text('Better luck next time.');

    
       // $('.summary-stats').text('[Stats Button]');
        //$('.summary-share').text('[Share Button]');
        $('.summary-countdownmessage').text('Next ' + this.gameName +  ' in:');
        
        let countDown = $('.summary-countdown');
        this.updateCountdown( countDown );
       
        //$('.summary-support').text('Enjoying this game? [Support Us Button]');
      
      
        //Hide some game divs
        $( '#guesses' ).addClass('hidden');
        $( '#search' ).addClass('hidden');
        $( '#buttons' ).addClass('hidden');


         //show summay             
        $( this.gameConfig.gameSummarySelector).removeClass('hidden');


    },
    updateStats : function(){
        console.log("Running updateStats");


        //get all game history
        let gameHistory = [];
        if (localStorage.getItem( this.gameConfig.localStorageName ) != null) {
            gameHistory = JSON.parse( localStorage.getItem( this.gameConfig.localStorageName ) );
        }
        //initialize stats
        let stats = {
            currentStreak : 0,
            longestStreak : 0,
            scoreSummary : {}
        }

        stats.gamesPlayed = gameHistory.filter(({hasFinished}) => hasFinished === true).length;
        stats.gamesWon = gameHistory.filter(({hasWon}) => hasWon === true).length;
        stats.winPercent =  (stats.gamesPlayed > 0) ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0;

        //get score summary
        let scoreOptions =  Array.from({length: this.maxGuesses}, (_, i) => i + 1)     
        scoreOptions.push('x');        
        $.each(scoreOptions, function(i, s){
            //console.log("scoreOption: " + s)
            stats.scoreSummary[s] = gameHistory.filter(({score, hasFinished}) => score === s && hasFinished === true).length;
        });

        //streaks (probably a better way)
        $.each(gameHistory, function(index, game) {
            /*console.log("game " + game.id 
                        + " hasWon " + game.hasWon
                        + " hasFinished " + game.hasFinished);*/

            if (game.hasFinished === true){  
             
                if (game.hasWon === true){ stats.currentStreak++; }
                else{ stats.currentStreak = 0; }

                //console.log("game " + game.id + " currentStreak " + stats.currentStreak);
                if (stats.currentStreak > stats.longestStreak){
                    stats.longestStreak = stats.currentStreak;
                }
            }
        });    

        
        this.stats = stats;
        console.log("Stats: " + JSON.stringify(this.stats));

    },
    displayStats : function(){
        console.log("Running displayStats");
        let _this = this;

        this.updateStats();

        //info
        $('.stats-wrapper').empty();

        let statsFigures = $( '<div>' ).addClass('stats-info').appendTo( '.stats-wrapper' );
        let statsLabels = $( '<div>' ).addClass('stats-info').appendTo( '.stats-wrapper' );

        $( '<div>' ).text('Played').appendTo(statsLabels);
        $( '<div>' ).text(this.stats.gamesPlayed).appendTo(statsFigures);
        
        $( '<div>' ).text('Won').appendTo(statsLabels);
        $( '<div>' ).text(this.stats.gamesWon).appendTo(statsFigures);
        
        $( '<div>' ).text('Win %').appendTo(statsLabels);
        $( '<div>' ).text(this.stats.winPercent).appendTo(statsFigures);
        
        $( '<div>' ).text('Streak').appendTo(statsLabels);
        $( '<div>' ).text(this.stats.currentStreak).appendTo(statsFigures);
        
        $( '<div>' ).html('Longest<Br>Streak').appendTo(statsLabels);
        $( '<div>' ).text(this.stats.longestStreak).appendTo(statsFigures);

        //chart
        $( '.stats-chart' ).empty();


        $.each(this.stats.scoreSummary, function(key, value){

            height = Math.floor((value / _this.stats.gamesPlayed) * 100) + "%"
           // console.log("stats " + key + " score: " + value  + "  height: " + height);
            bgClass = key == 'x' ? 'guess-bg-incorrect' : 'guess-bg-correct';
            displayValue = (value > 0) ? value : '';
            //add bar
            let barWrapper = $( '<div>' ).addClass('stats-bar-wrapper').appendTo('.stats-chart');
            
            $( '<div>' ).addClass('stats-bar-value')
                        .append( $('<div>').text(displayValue) )
                        .appendTo(barWrapper);
            $( '<div>' ).addClass('stats-bar')
                        .addClass(bgClass).css('height', height)
                        .appendTo(barWrapper);
            $( '<div>' ).addClass('stats-bar-label').text(key)
                        .appendTo(barWrapper);

        });
    },
    getShareInformation : function(){

        //* if game isnt complete then just share generic info
        let text = this.gameName + " #" + this.gameData.id + " " + String(this.gameState.score).toUpperCase() + "/" +this.maxGuesses + "\r\n"
                    + this.getScoreSummary(true) + "\r\n"
                    + this.gameURL;

        return text;
        
    }


}