20260826

* I have find a new addition that we should try to implement (with a toggle so people can decide if they want it or not)

  * I have found that via elevenlabs I have acces to a Text to Speech generator.There is also Voice selector tab to choose different voices and finally I can save the audio file as MP3 or WAV.
  * So  the idea is to have a prerecorded set of motivational sentences (with a few voice options) to say something upon completing a sector (based on pace) and at the race start/end

    * Lets think about it, make a small library that we can expand as we go along.
    * As proof of concept I added to this folder two mp3 files already which contain the same phrase "Good work, keep up the pace!", said by a male (James) and female (Piper voice)
* Also in general I dont think I have any sound in the app, while this has been thought about already for a long time for sector and end times but I think the sound files never made it into an update/build ?
* Also think about if there is any additional info that we should bake into the gpx+ data based on the files in "C:\\Users\\natha\\Claude personal projects\\Qualifire\\data\\activities\\TEST in app rides". If there is any other useful info, lets just add it, it costs nothing but is valuable for debugging problems

20260829

* We should enfore the ride you pick in the RECORD tab more strictly. I once picked and WorkHomeWet ride and then I diverged a bit and it autoswitched to WorkChurch, this should not happen, what you pick should stay locked until the end.
* Another thing that  should be changed is the Start place auto-detect toggle we have. When it is set on detect

  * It correctly finds the startplace, but the starting from place is then stuck, I cannot change it, I have to go back into the settings and switch the toggle to choose.

    * Ideally if it is set on detect, just detect it correctly but still allow for it to be changed direrctly from the RECORD tab
    * It is more a suggestion than something locked that you cannot change.
* Something else that needs fixing is how the gates show on every map (whether it is the record tab map or the actual live ride map)

  * The gates are usually visible when very zoomed in (like in "me" mode and then rather close) but whenever you zoom out or are in "fit" mode which shows the whole route, the gates disappear or are barely visible

    * I suspect this is a rendering issue, the line itself scales correctly with zooming in and out, but the gates do not, worth having a look at!
  * Also if you look at one svg render like the "C:\\Users\\natha\\Claude personal projects\\Qualifire\\design\\canonical\\record\_running\_day.svg" file. the gate lines have rounded ends, while in my app they have straight ends, worth smoothing out in my actuall app so it is consistent with the yellow route line which also has rounded ends
* based on C:\\Users\\natha\\Claude personal projects\\Qualifire\\data\\activities\\TEST in app rides\\qualifire-20260828 and the reviews

  * In ride1 for example I pressed pause and then resumed, is this logged correctly from the gpx+ data (I am not sure), if not we should update what the gpx+ data can contains so we get additional more accurate info. Since this is a custom export we do we really have a lot of freedome and should make the export as descriptive/useful as possible !

    * Because this is essential for the development phase to understand and know whats going on!
  * In ride2 I selected one route which locked correctly and then it switched

    * I think this is not visible in the gpx+ data because the original route is nowhere to be found
    * The gpx+ data should be a faithfull record of not only events but also events changes, so if I select a route >>write it into the gpx+ data

      * If the app confirms the route locked >> write it into the gpx+ data. if it stays unchanged, fine; but if it changes to another route >> should be logged so we can investigate what happened

