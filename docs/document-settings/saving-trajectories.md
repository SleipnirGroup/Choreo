# Saving your .chor file

Once trajectories are created by choreo, they must be saved within your robot project.

Choreo has 2 different kinds of files: 
a .chor file which stores general configs for your project,
and multiple .traj files which describe individually generated trajectories.

Once a .chor file is saved to a directory(folder), saving your project will
automatically update the .traj files in the same directory.

However, all of your .traj files must be saved within the deploy/choreo
folder of your robot code in order to be used by the robot. To do so,

1. Create a "choreo" folder within the "deploy" folder of your robot project. 
The deploy folder can be found within "src/main".
2. Open the choreo main menu and click "save project". 
3. Navigate to your robot project's folder, then find(and select) the "choreo" folder
you just created.
4. Name your .chor file whatever you want.

!!! warning
    Your .chor file must be placed within the deploy/choreo folder of your robot project.
    Not doing so will result in ChoreoLib(and PathPlannerLib) being unable to parse your project.