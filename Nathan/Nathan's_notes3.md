20260822

Some new ideas to try out

* First idea is having an option that will bring a completely different experience

  * I am thinking of having live dots for all the 10 ghosts you are racing so you can see them while you are riding (should probably be a bit transparent, so the main dot is the most visible)
  * The race screen should then also have a live position section where you can see where you are live in comparison to your ghosts
  * I dont know how to try this implementation yet:

    * Toggle in the settings to turn feature on/off, so it can be in the current app but can be removed if it causes too much distractions/error while I am still improving this mode
    * Or as a separate app so it can be tested fully independently
* A design idea we can consider is instead of labeling gates with a colour when you pass them to label the sectors

  * it actually makes more sense because the sectors are already what is actually scored and colored
  * So the idea is if you have a purple sector 1 for example, after you cross gate2, the line behind you gets purple (only the sector1, between gate1-2). After the whole lap, you then have a nice visual of each sector based on colours
  * Think about it (can also be a toggle in settings if we want to try this feature ? or does this complicate things ?)
* Other idea I had related to having a live race against yourself is transposing it into a completely different app for my workouts

  * I know have a very basic workout where I do only 4 exercises and I mark each rep on a whiteboard with 4 different marker colours

    * green:pushups;blue:leg raises; black:pull-ups; red:dips

      * I usually do in order 10 leg raises >> 5 pull ups >> 5 dips >> 5 pushups
  * My idea is to have it into an app which compares me to my previous versions; if you imagine this as a circuit where 10 versions of me are doing this and you get a live ranking of how fast you are compared to other versions

    * The idea is to after each set of exercises tap the phone screen to mark it as done; and then similarly to the Qualifire get colours based on if you are faster or slower than average
  * Overall this is just an idea to log somewhere and probably needs deep thought and a full separate team to work on this second app idea

Some questions I have

* I saw in cycle023 brief claude was talking about elevation outliers. I dont remember ever reporting an issue or something regarding elevation so I am wondering where it got the idea that this was something that needed fixing.
* I saw in "C:\\Users\\natha\\Claude personal projects\\Qualifire\\data\\activities\\TEST in app rides\\qualifire-20260820\\qualifire-20260820-rides123-review.md" that on ride3 it commented about "Route lock failure is likely due to poor initial GPS accuracy"

  * I did start recording while I was still in an underground parking, which is my fault. This coule explain poor initial gps, it is not necessarily an app fault this time



20260823

* I added myself the "C:\\Users\\natha\\Claude personal projects\\Qualifire\\cycles\\cycle-024-briefs\\Token usage (for reference).txt" file (copy-pasted from the claude chat) as I think it is useful to have a reference of how much tokens the tasks consume. So I think every cycle summary in "C:\\Users\\natha\\Claude personal projects\\Qualifire\\cycles" from now on should include a token usage section which details all token usage for each individual subagent involved in the process.

20260824

* I have normally already pasted this into the cycle024 chat but want to add it here so it is recorded as my own original idea

1\) i have thought a bit on how to do WP-B free ride mode. For now i think i have solved for 1 unknown so if either the start or end place is new, here is an idea on how it should go

* first my concern is if you just map all the known gates you might have an issue, if you look at the segment between work and home dry route, the gates would be duplicated because the gates in  both directions are not in the exact same place.

  * My idea is to have  a smart model:

    * If you from new >> home for example. It should only show the gates from the routes that have their endpoint "home". This way you dont trigger all the gates which are from the home>>work route which would be problematic
    * Same if you go from work>>new; you only show the "outwards" facing gates so the ones leaving work so you dont overlap with all incoming work gates
  * Does that make sense ?
* 2\) if you have genuinely two new positions, we need to think what we want to do then, just add it as a next task so we come back later on it

