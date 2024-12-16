# Saving

Once trajectories are created by Choreo, they must be saved within your robot project.

Choreo has 2 different kinds of files:
a .chor file which stores general configs for your project,
and multiple .traj files which describe individually generated trajectories.

## Saving your .chor file

Libraries such as ChoreoLib and PathPlannerLib require the project's .chor file
to be stored within the deploy/choreo directory. To do so:

1. Create a "choreo" folder within the "deploy" folder of your robot project.
   The deploy folder can be found within "src/main".
2. Open the choreo sidebar and click "save project"(see "Sidebar Navigation" for more details).
3. Navigate to your robot project's folder, then find(and select) the "choreo" folder
   you just created.
4. Name your .chor file whatever you want.

## Sidebar Navigation 

To access the sidebar, click the hamburger icon in the upper left corner.

![Sidebar image](../media/sidebar.png)

General Info:

!!! note
    Choreo’s file saving mechanism ties into a WPILib robot root directory, wherein a single `.chor` file lives in the project’s root folder.

In the sidebar, there are five actions related to saving your project, along with your project's current save location.

## Open File

This opens the system’s file select dialog to select the robot’s `.chor` file. This should already be in your robot project root folder.

## Save File

This opens the system’s file save dialog to select where to save the robot’s `.chor` file. Choreo strongly recommends saving this file in your robot project root folder.

## New File

Creates a new file in memory, essentially clearing all trajectories. If you have unsaved changes, Choreo will ask before clearing them.

## Export Trajectory

Exports the trajectory as a file individually to the path you select in the UI. This is not tied with the robot project structure, so you can place the trajectory file anywhere you like.

## Save All Trajectories

This saves all the trajectories into the folder structure described below.

## Project Details

If you have saved your choreo file correctly, you should see the following:

![Project Info](../media/project_info.png)

Below "Project saved at", you can see the directory in which the saved `.chor` file lives. You can also copy this path or open it in your system's file explorer.

If you see "Gradle project detected," then there is a `.gradle` file as well as a `src/main/deploy` directory in which to save trajectories.

!!! warning

    If you get the below, it means you have not saved the file yet

     ![Project not saved](../media/project_not_saved.png){: style="height:60px;"}

# Folder Structure Example

- Choreo file lives at: `~/Development/FRC/Roboto/src/main/deploy/choreo/Choreo.chor`
- Trajectories (`.traj`) live in: `~/Development/FRC/Roboto/src/main/deploy/choreo/...`
