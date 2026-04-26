export class DebugLogger {
  static logDummyPlacement(playerPosition, dummyPosition) {
    console.log(`🟢 Dummy Placed:
    Player Position: (${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)})
    Dummy Position:  (${dummyPosition.x.toFixed(2)}, ${dummyPosition.y.toFixed(2)}, ${dummyPosition.z.toFixed(2)})`);
  }

  static logDummyRemoval(dummyPosition, removalReason = 'Unknown') {
    console.log(`🔴 Dummy Removed:
    Position:  (${dummyPosition.x.toFixed(2)}, ${dummyPosition.y.toFixed(2)}, ${dummyPosition.z.toFixed(2)})
    Reason:    ${removalReason}`);
  }
}

