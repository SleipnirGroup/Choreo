<img width="1324" alt="image" src="./media/sidebar.png">

To access the sidebar, click the hamburger icon (top left of window).

General Info:

- Choreo’s file saving mechanism ties into a WPILib robot root directory, wherein a single `.chor` file lives in the project’s root folder.

There are 5 options as well as a description below those pertaining to saving info.

## Open File

This opens the system’s file select dialog to select the robot’s `.chor` file. This should already be in your robot project root folder.

## Save File

This opens the system’s file save dialog to select where to save the robot’s `.chor` file. Choreo strongly recommends saving this file in your robot project root folder.

## New File

Creates a new file in memory, essentially clearing all trajectories. If you have unsaved changes, Choreo will ask before clearing them.

## Export Trajectory

Exports the trajectory as a file individually as the path selected in the UI. This is not tied with the robot project structure, rather for you to get the trajectory file.

## Save All Trajectories

This saves all the trajectories into the folder structure described below.

# Folder Structure

Example: …