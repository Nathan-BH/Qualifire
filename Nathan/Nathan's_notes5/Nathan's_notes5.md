20260826

* I have find a new addition that we should try to implement (with a toggle so people can decide if they want it or not)

  * I have found that via elevenlabs I have acces to a Text to Speech generator.There is also Voice selector tab to choose different voices and finally I can save the audio file as MP3 or WAV.
  * So  the idea is to have a prerecorded set of motivational sentences (with a few voice options) to say something upon completing a sector (based on pace) and at the race start/end

    * Lets think about it, make a small library that we can expand as we go along.
    * As proof of concept I added two mp3 files already which contain the same phrase "Good work, keep up the pace!", said by a male (James) and female (Piper voice)
* Also in general I dont think I have any sound in the app, while this has been thought about already for a long time for sector and end times but I think the sound files never made it into an update/build ?
* Also think about if there is any additional info that we should bake into the gpx+ data based on the files in "C:\\Users\\natha\\Claude personal projects\\Qualifire\\data\\activities\\TEST in app rides". If there is any other useful info, lets just add it, it costs nothing but is valuable for debugging problems
* Something to think about

  * 1\. How Expo dev updates work, and when you need a full rebuild
  * 
  * Your dev-client app (the one that talks to your PC) never needs a rebuild — its JS loads live from Metro on your PC every time you open it, over the QR-code connection. That's the one you're using day to day.
  * 
  * "Qualifire Preview," the standalone app, works completely differently: its JavaScript is baked in at build time. As things are configured right now, every update to Preview — even a one-line change — needs a full new build. There's no over-the-air path today because the piece that would provide it (expo-updates / EAS Update) isn't installed in the project. That's a configuration fact, not a limitation of Expo itself — it can be added for the cost of one more build, and after that, JS-only changes would ship instantly without a build, with a build only needed for new native capability.

    * If its possible to have standalone app that can still be updated quickly we should get the architecture for it ASAP

