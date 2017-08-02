// This loads the environment variables from the .env file
// require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

server.get('/', function (request, response, next) {
    response.send(200, {status: 'online'});
    next();
});

server.get('/status', function (request, response) {
    response.send({status: 'online'});
});

// webchat route
server.get('/webchat', restify.serveStatic({
    directory: './public',
    default: 'index.html'
}));

// Create chat bot and listen to messages
var connector = new builder.ChatConnector({appId: process.env.MICROSOFT_APP_ID, appPassword: process.env.MICROSOFT_APP_PASSWORD});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [
    function (session) {
        builder
            .Prompts
            .choice(session, 'Choose a test message:', CardNames, {
                maxRetries: 3,
                retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
            });
    },
    function (session, results) {
        // create the card based on selection
        var selectedCardName = results.response.entity;

        if (selectedCardName === MessageWithUrl) {
            session.send('Message with URL - https://botframework.com');
            session.endConversation();
        } 
        else if (selectedCardName === MessageWithSuggestedActions) {
            session.beginDialog('suggested_actions');
        } 
        else if (selectedCardName === HtmlTableExample) {
            session.beginDialog('html_table');
        }
        else {
            var card = createCard(selectedCardName, session);
            // attach the card to the reply message
            var msg = new builder.Message(session).addAttachment(card);
            session.send(msg);
            session.endConversation();
        }
    }
]);

bot.dialog('/carousel', [
    function (session) {
        session.send("You can pass a custom message to Prompts.choice() that will present the user with a carousel of cards to select from. Each card can even support multiple actions.");
        
        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:100", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .text("<b>Pike Place Market</b> is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:101", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("EMP Museum")
                    .text("<b>EMP Musem</b> is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:102", "Select")
                    ])
            ]);
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '100':
                item = "the <b>Space Needle</b>";
                break;
            case '101':
                item = "<b>Pikes Place Market</b>";
                break;
            case '102':
                item = "the <b>EMP Museum</b>";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }    
]);

bot.dialog('suggested_actions', [
    function (session) {
        
        var msg = new builder.Message(session)
            .text("Hi! What is your favorite color?")
            .suggestedActions(
                builder.SuggestedActions.create(
                    session,[
                        builder.CardAction.imBack(session, "green", "green"),
                        builder.CardAction.imBack(session, "blue", "blue"),
                        builder.CardAction.imBack(session, "red", "red")
                    ]
                )
            );
        builder.Prompts.choice(session, msg, ["green", "blue", "red"]);
    },
    function(session, results) {
        session.send('I like ' +  results.response.entity + ' too!');
    }
]);

bot.dialog('html_table', function (session) {
    var tableHTML = '<table style="padding:10px;border:1px solid black;"><tr style="background-color:#c6c6c6"><th>Countries</th><th>Capitals</th><th>Population</th><th>Language</th></tr><tr><td>USA</td><td>Washington D.C.</td><td>309 million</td><td>English</td></tr><tr><td>Sweden</td><td>Stockholm</td><td>9 million</td><td>Swedish</td></tr></table>';
    var message = {
        type: 'message',
        textFormat: 'xml', 
        text: tableHTML
    };
    session.send(message).endDialog();
});

var MessageWithUrl = 'Message with URL';
var HeroCardName = 'Hero card';
var ThumbnailCardName = 'Thumbnail card';
var ReceiptCardName = 'Receipt card';
var SigninCardName = 'Sign-in card';
var AnimationCardName = 'Animation card';
var VideoCardName = 'Video card';
var AudioCardName = 'Audio card';
var CarouselOfCards = 'Carousel of Cards';
var ThumbnailCardWithFourButtons = 'Thumbnail w/ 4 Buttons';
var HeroCardWithFourButtons = 'Hero w/ 4 Buttons';
var HeroCardWithFourButtonsNoSubtitle = 'Hero 4 buttons no subtitle';
var MessageWithSuggestedActions = 'Suggested Actions';
var HtmlTableExample = 'HTML Table';

var CardNames = [
    MessageWithUrl,
    HeroCardName,
    ThumbnailCardName,
    ReceiptCardName,
    SigninCardName,
    AnimationCardName,
    VideoCardName,
    AudioCardName,
    CarouselOfCards,
    ThumbnailCardWithFourButtons,
    HeroCardWithFourButtons,
    HeroCardWithFourButtonsNoSubtitle,
    MessageWithSuggestedActions,
    HtmlTableExample
];

function createCard(selectedCardName, session) {
    switch (selectedCardName) {
        case HeroCardName:
            return createHeroCard(session);
            break;
        case ThumbnailCardName:
            return createThumbnailCard(session);
            break;
        case ReceiptCardName:
            return createReceiptCard(session);
            break;
        case SigninCardName:
            return createSigninCard(session);
            break;
        case AnimationCardName:
            return createAnimationCard(session);
            break;
        case VideoCardName:
            return createVideoCard(session);
            break;
        case AudioCardName:
            return createAudioCard(session);
            break;
        case CarouselOfCards:
            session.beginDialog('/carousel');
            break;
        case ThumbnailCardWithFourButtons:
            return createThumbnailCardWithFourButtons(session);
            break;
        case HeroCardWithFourButtons:
            return createHeroCardWithFourButtons(session);
            break;
        case HeroCardWithFourButtonsNoSubtitle:
            return createHeroCardWithFourButtonsNoSubtitle(session);
            break;
        default:
            return createHeroCard(session);
            break;
    }
}

function createHeroCard(session) {
    return new builder
        .HeroCard(session)
        .title('BotFramework Hero Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally whereve' +
                'r they are, from text/sms to Skype, Slack, Office 365 mail and other popular ser' +
                'vices.   There are two spaces in front of this line.   Did a line break happen?           Line break?')
        .images([
            builder
                .CardImage
                .create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbo' +
                        'tframework_960.jpg')
        ])
        .buttons([
            builder
                .CardAction
                .openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started')
        ]);
}

function createHeroCardWithFourButtons(session) {
    return new builder
        .HeroCard(session)
        .title('Hero Card w/ 4 buttons')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally whereve' +
                'r they are, from text/sms to Skype, Slack, Office 365 mail and other popular ser' +
                'vices.')
        .images([
            builder
                .CardImage
                .create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbo' +
                        'tframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-overview', 'Node SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/dotnet/bot-builder-dotnet-overview', '.NET SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/rest-api/bot-framework-rest-overview', 'REST APIs')
        ]);
}
function createHeroCardWithFourButtonsNoSubtitle(session) {
    return new builder
        .HeroCard(session)
        .title('Hero Card w/ 4 buttons')
        .text('Build and connect intelligent bots to interact with your users naturally whereve' +
                'r they are, from text/sms to Skype, Slack, Office 365 mail and other popular ser' +
                'vices.')
        .images([
            builder
                .CardImage
                .create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbo' +
                        'tframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-overview', 'Node SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/dotnet/bot-builder-dotnet-overview', '.NET SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/rest-api/bot-framework-rest-overview', 'REST APIs')
        ]);
}

function createThumbnailCard(session) {
    return new builder
        .ThumbnailCard(session)
        .title('BotFramework Thumbnail Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally whereve' +
                'r they are, from text/sms to Skype, Slack, Office 365 mail and other popular ser' +
                'vices.')
        .images([
            builder
                .CardImage
                .create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbo' +
                        'tframework_960.jpg')
        ])
        .buttons([
            builder
                .CardAction
                .openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started')
        ]);
}

function createThumbnailCardWithFourButtons(session) {
    return new builder
        .ThumbnailCard(session)
        .title('Thumbnail Card with 4 buttons')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally whereve' +
                'r they are, from text/sms to Skype, Slack, Office 365 mail and other popular ser' +
                'vices.')
        .images([
            builder
                .CardImage
                .create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbo' +
                        'tframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-overview', 'Node SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/dotnet/bot-builder-dotnet-overview', '.NET SDK'),
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/en-us/bot-framework/rest-api/bot-framework-rest-overview', 'REST APIs')
        ]);
}

var order = 1234;
function createReceiptCard(session) {
    return new builder
        .ReceiptCard(session)
        .title('John Doe')
        .facts([
            builder
                .Fact
                .create(session, order++, 'Order Number'),
            builder
                .Fact
                .create(session, 'VISA 5555-****', 'Payment Method')
        ])
        .items([
            builder
                .ReceiptItem
                .create(session, '$ 38.45', 'Data Transfer')
                .quantity(368)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.p' +
                        'ng')),
            builder
                .ReceiptItem
                .create(session, '$ 45.00', 'App Service')
                .quantity(720)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
        ])
        .tax('$ 7.50')
        .total('$ 90.95')
        .buttons([
            builder
                .CardAction
                .openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
                .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/micros' +
                        'oft-azure.png')
        ]);
}

function createSigninCard(session) {
    return new builder
        .SigninCard(session)
        .text('BotFramework Sign-in Card')
        .button('Sign-in', 'https://login.microsoftonline.com');
}

function createAnimationCard(session) {
    return new builder
        .AnimationCard(session)
        .title('Microsoft Bot Framework')
        .subtitle('Animation Card')
        .image(builder.CardImage.create(session, 'https://docs.botframework.com/en-us/images/faq-overview/botframework_overview_ju' +
                'ly.png'))
        .media([
            {
                url: 'https://i.giphy.com/Ki55RUbOV5njy.gif'
            }
        ]);
}

function createVideoCard(session) {
    return new builder
        .VideoCard(session)
        .title('Big Buck Bunny')
        .subtitle('by the Blender Institute')
        .text('Big Buck Bunny (code-named Peach) is a short computer-animated comedy film by th' +
                'e Blender Institute, part of the Blender Foundation. Like the foundation\'s prev' +
                'ious film Elephants Dream, the film was made using Blender, a free software appl' +
                'ication for animation made by the same foundation. It was released as an open-so' +
                'urce film under Creative Commons License Attribution 3.0.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_' +
                'big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            {
                url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'
            }
        ])
        .buttons([
            builder
                .CardAction
                .openUrl(session, 'https://peach.blender.org/', 'Learn More')
        ]);
}

function createAudioCard(session) {
    return new builder
        .AudioCard(session)
        .title('I am your father')
        .subtitle('Star Wars: Episode V - The Empire Strikes Back')
        .text('The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes' +
                ' Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leig' +
                'h Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing t' +
                'he film\'s story and serving as executive producer. The second installment in th' +
                'e original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. a' +
                'nd stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony ' +
                'Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'))
        .media([
            {
                url: 'https://www.wavlist.com/movies/004/father.wav'
            }
        ])
        .buttons([
            builder
                .CardAction
                .openUrl(session, 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back', 'Read More')
        ]);
}

bot
    .dialog('exit', function (session) {
        session.endConversation('Goodbye!');
    })
    .triggerAction({matches: /(quit|exit)/i});

// END OF LINE