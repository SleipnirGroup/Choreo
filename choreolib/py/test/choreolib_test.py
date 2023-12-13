import os
from choreolib import choreo, choreoTrajectory

def getResourcesFolder():
    return os.path.join(os.path.dirname(__file__), "resources")

def test_basicParse():
    fileUnderTest = os.path.join(getResourcesFolder(), "test1.traj")
    path = choreo.fromFile(fileUnderTest)
    
    for i in range(0, 500):
        path.sample(i*0.01)
        # todo some pass fail
        
def test_basicParse2():
    fileUnderTest = os.path.join(getResourcesFolder(), "test2.traj")
    path = choreo.fromFile(fileUnderTest)
    
    for i in range(0, 500):
        path.sample(i*0.01)
        # todo some pass fail
        
def test_basicParse3():
    fileUnderTest = os.path.join(getResourcesFolder(), "test3.traj")
    path = choreo.fromFile(fileUnderTest)
    
    for i in range(0, 500):
        path.sample(i*0.01)
        # todo some pass fail