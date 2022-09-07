let debugMode = true;

if (debugMode === false){ 
    console.log = function() {}
}



// * arrow functions would preserve this scope below


// Game code
var game = {
    gameConfig : null,   //settings passed to the constructor
    gameData : null,  //data for this individual days game /config
    gameState : null,  //info about the game state, previous guesses, whether the game has been finished etc
    gameName : "Birdle",
    gameURL : "https://birdle.isnow.online",
    imageBasePath : "gameimages/",
    stats : null,
    currentGuess : 0, 
    maxGuesses : 5,
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
                _this.showCompletedPage();

                //display full image
                _this.displayCanvas();
            }
            //game was not finished partial game
            else{  
                
                _this.currentGuess = _this.gameState.guessList.length;
                if (_this.currentGuess >= _this.maxGuesses-1){
                    $( _this.gameConfig.skipButtonSelector ).val("Give Up");
                }

                //display image so far
                _this.displayCanvas();
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
                score : 'x'
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
        //console.log("gameState: " + JSON.stringify(this.gameState));
       // console.log("saving gameHistory: " + JSON.stringify(gameHistory));
        localStorage.setItem( this.gameConfig.localStorageName, JSON.stringify(gameHistory) );

    },
    displayCanvas : function(){
        console.log("Running displayCanvas");
        let _this = this;


        //load image if not already loaded
        let FullImagePath = this.imageBasePath + this.gameData.image
        console.log("Loading image " +  FullImagePath)
        var image = new Image();
        
     

        image.onload = function(){
            console.log("The image was loaded");
            let numColsToCut = 3;
            let numRowsToCut = 2
            console.log("Image width: " + this.width);

            let widthOfOnePiece = this.width / numColsToCut;
            let heightOfOnePiece = this.height / numRowsToCut;

            var imagePieces = [];
            for(var x = 0; x < numColsToCut; ++x) {
                for(var y = 0; y < numRowsToCut; ++y) {
                    var canvas = document.createElement('canvas');
                    canvas.width = widthOfOnePiece;
                    canvas.height = heightOfOnePiece;
                    var context = canvas.getContext('2d');
                    //draw image with offset
                    context.drawImage(image, x * widthOfOnePiece, y * heightOfOnePiece, widthOfOnePiece, heightOfOnePiece, 0, 0, canvas.width, canvas.height);
                    imagePieces.push(canvas.toDataURL());
                }
            }


            // load one piece onto the page
            console.log("loading image piece " + imagePieces[0]);

            $( _this.gameConfig.gameCanvasSelector ).css( {
                'display' : 'inline-grid',
                'grid-gap': '1px',
                'grid-template-columns' : 'repeat(' + numColsToCut + ', 1fr)'
            });
            
            $( "<img>" ).attr("src", imagePieces[0]).appendTo(  _this.gameConfig.gameCanvasSelector );
            $( "<img>" ).attr("src", imagePieces[2]).appendTo(  _this.gameConfig.gameCanvasSelector );
            $( "<img>" ).attr("src", imagePieces[4]).appendTo(  _this.gameConfig.gameCanvasSelector );
            $( "<img>" ).attr("src", imagePieces[1]).appendTo(  _this.gameConfig.gameCanvasSelector );
            $( "<img>" ).attr("src", imagePieces[3]).appendTo(  _this.gameConfig.gameCanvasSelector );
            $( "<img>" ).attr("src", imagePieces[5]).appendTo(  _this.gameConfig.gameCanvasSelector );
        };


        image.src = FullImagePath;





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

        if (guess == '') //skipped
        {
            thisGuess.status = "skipped";
            newClass = 'guess-bg-skipped';
        }
        else if (guess == this.gameData.answer) //correct guess
        {
            thisGuess.status  = "correct";
            this.gameState.hasWon = true;
            this.gameState.score = this.currentGuess + 1;
            newClass = 'guess-bg-correct';

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
            //display the full image

            this.displayStats();
            this.onComplete(); 

        }else{

            this.saveGameState();

            //reveal a new square

        

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
    onComplete : function(result){    },
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
       
        let output = null;

        let fullGuessList = this.gameState.guessList.map(item => item.status);
        for (let i=0;i< (this.maxGuesses - this.gameState.guessList.length );i++){
            fullGuessList.push( 'notused' );  
        }

        console.log("fullGuessList: " + JSON.stringify(fullGuessList));

        if (unicode === true)
        {
            
            let unicodeArray = fullGuessList.map(item => {
                return item.replace('incorrect', '🟥')
                            .replace('partcorrect', '🟨')  //🟧     
                            .replace('correct', '🟩')
                            .replace('skipped', '⬛')
                            .replace('notused', '⬜');
                
            });

            console.log("unicodeArray: " + JSON.stringify(unicodeArray));

            output = unicodeArray.join(''); 
            console.log("output: " + output);

        }else{
            output = $( '<div>' ).addClass('score-wrapper');

            fullGuessList.forEach(guessStatus => {
                let newClass = "guess-bg-" + guessStatus
                console.log("adding score box");
                $('<div>').addClass('scorebox').addClass(newClass).appendTo(output);       
            });
      
        }


        return output;
    },
    showCompletedPage : function(){
        console.log("Running showCompletedPage");
        
        $('.summary-gamenumber').text(this.gameName +  "#" + this.gameData.id);
        $('.summary-trackname').text(this.gameData.FullTrackName);
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
        let text = this.gameName + "#" + this.gameData.id + " " + String(this.gameState.score).toUpperCase() + "/" +this.maxGuesses + "\r\n"
                    + this.getScoreSummary(true) + "\r\n"
                    + this.gameURL;

        return text;
        
    }


}