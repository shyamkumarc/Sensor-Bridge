import { useEffect, useRef } from "react";
import { useEndpoints } from "@/context/EndpointContext";
import { useSensor } from "@/context/SensorContext";
import { useStreaming } from "@/context/StreamingContext";

/**
 * Invisible component mounted once at the root layout level.
 * Runs the sensor dispatch interval independently of which tab is active.
 */
export function DataDispatcher() {
  const { sensorData, isCollecting, updateInterval } = useSensor();
  const { sendToEndpoints } = useEndpoints();
  const { broadcastSensorData } = useStreaming();

  const latestSensorRef = useRef(sensorData);
  const sendRef = useRef(sendToEndpoints);
  const broadcastRef = useRef(broadcastSensorData);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { latestSensorRef.current = sensorData; }, [sensorData]);
  useEffect(() => { sendRef.current = sendToEndpoints; }, [sendToEndpoints]);
  useEffect(() => { broadcastRef.current = broadcastSensorData; }, [broadcastSensorData]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isCollecting) {
      const dispatch = () => {
        broadcastRef.current(latestSensorRef.current);
        sendRef.current(latestSensorRef.current);
      };

      dispatch(); // immediate send on start

      timerRef.current = setInterval(dispatch, updateInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCollecting, updateInterval]);

  return null;
}
