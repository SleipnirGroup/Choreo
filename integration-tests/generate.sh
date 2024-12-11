mkdir test-tmp
cp ./test-jsons/project/0/swerve.chor ./test-tmp/swerve.chor
cp ./test-jsons/trajectory/0/swerve.traj ./test-tmp/swerve.traj

./target/${RUST_TOOLCHAIN}/release/choreo-cli --chor ./test-tmp/swerve.chor --all-trajectory --generate
cp ./test-tmp/swerve.traj ./test-tmp/swerve.traj.first

# Again to test if the cli produced loadable files
./target/${RUST_TOOLCHAIN}/release/choreo-cli --chor ./test-tmp/swerve.chor --all-trajectory --generate
# Same generation 
diff -u ./test-tmp/swerve.traj.first ./test-tmp/swerve.traj
# Verify no change to the .chor in the CLI
diff -u ./test-jsons/project/0/swerve.chor ./test-tmp/swerve.chor