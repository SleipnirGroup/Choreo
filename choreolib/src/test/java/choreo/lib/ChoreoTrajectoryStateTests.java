// Copyright (c) Choreo contributors

package choreo.lib;

import static org.junit.jupiter.api.Assertions.*;

import com.choreo.lib.ChoreoTrajectoryState;
import com.google.gson.Gson;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

public class ChoreoTrajectoryStateTests {
  private static final double kEpsilon = 0.001;

  private static final Gson sGson = new Gson();

  private static ChoreoTrajectoryState mState =
      new ChoreoTrajectoryState(
          0.0,
          1.0,
          2.0,
          3.14,
          1.0,
          2.0,
          3.14,
          new double[] {1.0, 2.0, 3.0, 4.0},
          new double[] {1.0, 2.0, 3.0, 4.0});

  private static String mJson;

  @BeforeAll
  public static void beforeAll() {
    StringBuilder builder = new StringBuilder();

    builder.append('{');
    builder.append("\"timestamp\":0.0,");
    builder.append("\"x\":1.0,\"y\":2.0,\"heading\":3.14,");
    builder.append("\"velocityX\":1.0,\"velocityY\":2.0,\"angularVelocity\":3.14,");
    builder.append("\"moduleForcesX\":[1.0,2.0,3.0,4.0],");
    builder.append("\"moduleForcesY\":[1.0,2.0,3.0,4.0]");
    builder.append('}');

    mJson = builder.toString();
  }

  @Test
  public void serializeState() {
    String json = sGson.toJson(mState);
    System.out.println(json);
    assertTrue(mJson.equals(json));
  }

  @Test
  public void deserializeState() {
    ChoreoTrajectoryState state = sGson.fromJson(mJson, ChoreoTrajectoryState.class);
    assertEquals(state.timestamp, mState.timestamp);
    assertEquals(state.x, mState.x, kEpsilon);
    assertEquals(state.y, mState.y, kEpsilon);
    assertEquals(state.heading, mState.heading, kEpsilon);
    assertEquals(state.velocityX, mState.velocityX, kEpsilon);
    assertEquals(state.velocityY, mState.velocityY, kEpsilon);
    assertEquals(state.angularVelocity, mState.angularVelocity, kEpsilon);

    // check for correct length
    assertEquals(state.moduleForcesX.length, mState.moduleForcesX.length);
    // check for same length
    assertEquals(state.moduleForcesX.length, state.moduleForcesY.length);

    for (int i = 0; i < 4; ++i) {
      assertEquals(state.moduleForcesX[i], mState.moduleForcesX[i], kEpsilon);
      assertEquals(state.moduleForcesY[i], mState.moduleForcesY[i], kEpsilon);
    }
  }
}
