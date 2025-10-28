import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const PomodoroTimer = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsActive(false);
    
    if (mode === "focus") {
      toast({
        title: "Focus Session Complete!",
        description: "Time for a 5-minute break.",
      });
      setMode("break");
      setMinutes(5);
      setSeconds(0);
    } else {
      toast({
        title: "Break Complete!",
        description: "Ready for another focus session?",
      });
      setMode("focus");
      setMinutes(25);
      setSeconds(0);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === "focus") {
      setMinutes(25);
      setSeconds(0);
    } else {
      setMinutes(5);
      setSeconds(0);
    }
  };

  const switchMode = () => {
    setIsActive(false);
    if (mode === "focus") {
      setMode("break");
      setMinutes(5);
      setSeconds(0);
    } else {
      setMode("focus");
      setMinutes(25);
      setSeconds(0);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <CardTitle>Pomodoro Timer</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-sm font-medium mb-2 text-muted-foreground">
            {mode === "focus" ? "Focus Time" : "Break Time"}
          </div>
          <div className="text-5xl font-bold mb-4">
            {formatTime(minutes, seconds)}
          </div>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button onClick={toggleTimer} size="sm">
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={resetTimer} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button onClick={switchMode} variant="outline" size="sm">
            Switch to {mode === "focus" ? "Break" : "Focus"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};