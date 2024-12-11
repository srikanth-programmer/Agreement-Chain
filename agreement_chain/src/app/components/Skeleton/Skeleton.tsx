import React from "react";
import styles from "./Skeleton.module.css";

type Props = {
  width?: string;
  height?: string;
  styleClass?: string;
};

export default function Skeleton({ height, width, styleClass }: Props) {
  return (
    <div
      style={{
        width,
        height,
      }}
      className={`${styles.skeleton} !rounded-full ${styleClass}`}
    />
  );
}
