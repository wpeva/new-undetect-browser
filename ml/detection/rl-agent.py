"""
Session 11: Adaptive Detection System - RL Agent

Reinforcement Learning agent that learns optimal anti-detection
configurations through trial and error.

Uses PPO (Proximal Policy Optimization) to train an agent that:
1. Observes detection scores from various detectors
2. Takes actions to adjust protection levels
3. Receives rewards for improving stealth while minimizing performance impact
"""

import gym
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.callbacks import BaseCallback
import json
import subprocess
import sys
from typing import Dict, List, Tuple, Optional
import os


class DetectionTestCallback(BaseCallback):
    """
    Custom callback for tracking training progress
    """

    def __init__(self, verbose=0):
        super(DetectionTestCallback, self).__init__(verbose)
        self.episode_rewards = []
        self.episode_lengths = []

    def _on_step(self) -> bool:
        return True

    def _on_rollout_end(self) -> None:
        if self.verbose > 0:
            print(f"Rollout ended. Mean reward: {np.mean(self.episode_rewards[-10:]):.2f}")


class AntiDetectionEnv(gym.Env):
    """
    Custom Gym environment for anti-detection RL training

    Action Space:
        Box(10,) - Continuous values [0, 1] for each protection module:
        [0] canvas_noise_level
        [1] webgl_noise_level
        [2] audio_noise_level
        [3] font_spoofing_level
        [4] timezone_offset
        [5] language_randomization
        [6] hardware_concurrency_override
        [7] device_memory_override
        [8] screen_resolution_noise
        [9] user_agent_rotation

    Observation Space:
        Box(5,) - Detection scores [0, 100] from each detector:
        [0] pixelscan_score
        [1] creepjs_score
        [2] browserleaks_score
        [3] incolumitas_score
        [4] sannysoft_score
    """

    metadata = {'render.modes': ['human']}

    def __init__(self, test_command: str = 'npm run test:detection', max_steps: int = 50):
        """
        Initialize the environment

        Args:
            test_command: Command to run detection tests
            max_steps: Maximum steps per episode
        """
        super(AntiDetectionEnv, self).__init__()

        # Action space: 10 protection module levels [0, 1]
        self.action_space = gym.spaces.Box(
            low=0.0, high=1.0, shape=(10,), dtype=np.float32
        )

        # Observation space: 5 detector scores [0, 100]
        self.observation_space = gym.spaces.Box(
            low=0.0, high=100.0, shape=(5,), dtype=np.float32
        )

        self.test_command = test_command
        self.max_steps = max_steps
        self.current_step = 0
        self.current_config = self._default_config()
        self.baseline_scores = None
        self.best_score = 0
        self.best_config = None

        # History tracking
        self.episode_history = []
        self.all_configs = []

    def _default_config(self) -> Dict:
        """Return default protection configuration"""
        return {
            'canvas_noise': 0.5,
            'webgl_noise': 0.5,
            'audio_noise': 0.5,
            'font_spoofing': 0.5,
            'timezone': 0.5,
            'language': 0.5,
            'hardware_concurrency': 0.5,
            'device_memory': 0.5,
            'screen_noise': 0.5,
            'user_agent_rotation': 0.5,
        }

    def _action_to_config(self, action: np.ndarray) -> Dict:
        """Convert action array to protection configuration"""
        config = {
            'canvas_noise': float(action[0]),
            'webgl_noise': float(action[1]),
            'audio_noise': float(action[2]),
            'font_spoofing': float(action[3]),
            'timezone': float(action[4]),
            'language': float(action[5]),
            'hardware_concurrency': float(action[6]),
            'device_memory': float(action[7]),
            'screen_noise': float(action[8]),
            'user_agent_rotation': float(action[9]),
        }
        return config

    def _test_detectors(self, config: Dict) -> np.ndarray:
        """
        Test current configuration against all detectors

        Returns:
            np.ndarray: Detection scores [0-100] for each detector
        """
        # In a real implementation, this would:
        # 1. Launch browser with the given config
        # 2. Run detection tests using DetectionMonitor
        # 3. Return actual scores

        # For training purposes, we'll simulate scores based on config
        # Better configs (balanced, not too aggressive) get better scores

        scores = []

        # Simulate detector responses
        # Each detector has different sensitivity to different protections

        # PixelScan (sensitive to canvas, webgl, basic protections)
        pixelscan = 60 + config['canvas_noise'] * 20 + config['webgl_noise'] * 15
        pixelscan -= abs(config['canvas_noise'] - 0.7) * 20  # Optimal around 0.7
        scores.append(np.clip(pixelscan, 0, 100))

        # CreepJS (comprehensive checks, looks for consistency)
        consistency_penalty = 0
        values = list(config.values())
        std_dev = np.std(values)
        if std_dev > 0.3:  # Penalize inconsistent configs
            consistency_penalty = std_dev * 30

        creepjs = 70 + np.mean(values) * 25 - consistency_penalty
        scores.append(np.clip(creepjs, 0, 100))

        # BrowserLeaks (canvas focused)
        browserleaks = 65 + config['canvas_noise'] * 30
        browserleaks -= abs(config['canvas_noise'] - 0.6) * 25
        scores.append(np.clip(browserleaks, 0, 100))

        # Incolumitas (automation detection)
        incolumitas = 55 + config['user_agent_rotation'] * 20
        incolumitas += (config['hardware_concurrency'] + config['device_memory']) * 10
        scores.append(np.clip(incolumitas, 0, 100))

        # Sannysoft (basic checks)
        sannysoft = 70 + np.mean([config['webgl_noise'], config['audio_noise']]) * 25
        scores.append(np.clip(sannysoft, 0, 100))

        # Add some noise to simulate real-world variability
        noise = np.random.normal(0, 2, 5)
        scores = np.array(scores) + noise

        return np.clip(scores, 0, 100).astype(np.float32)

    def reset(self) -> np.ndarray:
        """Reset the environment to initial state"""
        self.current_step = 0
        self.current_config = self._default_config()

        # Get baseline scores with default config
        self.baseline_scores = self._test_detectors(self.current_config)

        # Save episode history if exists
        if self.episode_history:
            self.all_configs.append({
                'config': self.best_config,
                'score': self.best_score
            })
            self.episode_history = []

        return self.baseline_scores

    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict]:
        """
        Take a step in the environment

        Args:
            action: Protection levels to apply

        Returns:
            observation: New detection scores
            reward: Reward for this action
            done: Whether episode is complete
            info: Additional information
        """
        self.current_step += 1

        # Convert action to config
        self.current_config = self._action_to_config(action)

        # Test with new config
        scores = self._test_detectors(self.current_config)

        # Calculate reward
        reward = self._calculate_reward(scores, action)

        # Track best configuration
        avg_score = np.mean(scores)
        if avg_score > self.best_score:
            self.best_score = avg_score
            self.best_config = self.current_config.copy()

        # Episode history
        self.episode_history.append({
            'step': self.current_step,
            'config': self.current_config.copy(),
            'scores': scores.tolist(),
            'reward': reward,
            'avg_score': avg_score
        })

        # Check if done
        done = self.current_step >= self.max_steps or avg_score >= 95

        info = {
            'step': self.current_step,
            'avg_score': avg_score,
            'best_score': self.best_score,
            'individual_scores': {
                'pixelscan': scores[0],
                'creepjs': scores[1],
                'browserleaks': scores[2],
                'incolumitas': scores[3],
                'sannysoft': scores[4],
            }
        }

        return scores, reward, done, info

    def _calculate_reward(self, scores: np.ndarray, action: np.ndarray) -> float:
        """
        Calculate reward for current state

        Reward components:
        1. Detection score improvement (main component)
        2. Penalty for aggressive protection (performance impact)
        3. Bonus for consistent configuration
        4. Bonus for achieving high scores
        """
        # 1. Main reward: Average detection score (0-100)
        avg_score = np.mean(scores)
        score_reward = avg_score / 10.0  # Scale to reasonable range

        # 2. Penalty for overly aggressive protection (performance impact)
        # Higher values mean more protection but worse performance
        aggression_penalty = np.mean(action) * 0.5

        # 3. Consistency bonus (similar protection levels are better)
        consistency = 1.0 - np.std(action)
        consistency_bonus = consistency * 0.3

        # 4. High score bonus
        high_score_bonus = 0
        if avg_score >= 90:
            high_score_bonus = 2.0
        elif avg_score >= 85:
            high_score_bonus = 1.0

        # 5. Improvement bonus (compared to previous)
        improvement_bonus = 0
        if self.baseline_scores is not None:
            improvement = avg_score - np.mean(self.baseline_scores)
            improvement_bonus = improvement / 10.0

        # Total reward
        total_reward = (
            score_reward
            - aggression_penalty
            + consistency_bonus
            + high_score_bonus
            + improvement_bonus
        )

        return total_reward

    def render(self, mode='human'):
        """Render the environment state"""
        if mode == 'human':
            print(f"\n{'='*60}")
            print(f"Step: {self.current_step}/{self.max_steps}")
            print(f"{'='*60}")
            print("Current Configuration:")
            for key, value in self.current_config.items():
                print(f"  {key}: {value:.3f}")
            print(f"\nBest Score: {self.best_score:.2f}")
            print(f"{'='*60}\n")

    def close(self):
        """Clean up resources"""
        pass


def train_agent(
    env: gym.Env,
    total_timesteps: int = 100000,
    model_path: str = 'anti_detection_agent',
    tensorboard_log: Optional[str] = None
) -> PPO:
    """
    Train the RL agent

    Args:
        env: Gym environment
        total_timesteps: Total training steps
        model_path: Path to save model
        tensorboard_log: Path for tensorboard logs

    Returns:
        Trained PPO model
    """
    print(f"Training RL agent for {total_timesteps} timesteps...")
    print(f"Action space: {env.action_space}")
    print(f"Observation space: {env.observation_space}")

    # Create callback
    callback = DetectionTestCallback(verbose=1)

    # Create PPO model
    model = PPO(
        'MlpPolicy',
        env,
        verbose=1,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        tensorboard_log=tensorboard_log
    )

    # Train
    print("\nStarting training...")
    model.learn(total_timesteps=total_timesteps, callback=callback)

    # Save model
    model.save(model_path)
    print(f"\n✅ Model saved to {model_path}")

    return model


def evaluate_agent(model: PPO, env: gym.Env, n_episodes: int = 10) -> Dict:
    """
    Evaluate trained agent

    Args:
        model: Trained PPO model
        env: Gym environment
        n_episodes: Number of evaluation episodes

    Returns:
        Evaluation results
    """
    print(f"\nEvaluating agent for {n_episodes} episodes...")

    episode_rewards = []
    episode_scores = []
    best_configs = []

    for episode in range(n_episodes):
        obs = env.reset()
        done = False
        episode_reward = 0

        while not done:
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, info = env.step(action)
            episode_reward += reward

        episode_rewards.append(episode_reward)
        episode_scores.append(info['best_score'])
        best_configs.append(env.best_config)

        print(f"Episode {episode + 1}: Reward={episode_reward:.2f}, Best Score={info['best_score']:.2f}")

    results = {
        'mean_reward': np.mean(episode_rewards),
        'std_reward': np.std(episode_rewards),
        'mean_score': np.mean(episode_scores),
        'std_score': np.std(episode_scores),
        'best_config': best_configs[np.argmax(episode_scores)],
        'max_score': np.max(episode_scores),
    }

    print(f"\n{'='*60}")
    print("Evaluation Results:")
    print(f"{'='*60}")
    print(f"Mean Reward: {results['mean_reward']:.2f} ± {results['std_reward']:.2f}")
    print(f"Mean Score: {results['mean_score']:.2f} ± {results['std_score']:.2f}")
    print(f"Max Score: {results['max_score']:.2f}")
    print(f"\nBest Configuration:")
    for key, value in results['best_config'].items():
        print(f"  {key}: {value:.3f}")
    print(f"{'='*60}\n")

    return results


def main():
    """Main training script"""
    import argparse

    parser = argparse.ArgumentParser(description='Train RL agent for anti-detection')
    parser.add_argument('--timesteps', type=int, default=100000, help='Total training timesteps')
    parser.add_argument('--episodes', type=int, default=10, help='Evaluation episodes')
    parser.add_argument('--output', type=str, default='anti_detection_agent', help='Model output path')
    parser.add_argument('--tensorboard', type=str, default=None, help='Tensorboard log directory')
    parser.add_argument('--eval-only', action='store_true', help='Only evaluate existing model')
    parser.add_argument('--model', type=str, default='anti_detection_agent', help='Model to evaluate')

    args = parser.parse_args()

    # Create environment
    env = AntiDetectionEnv(max_steps=50)

    # Check environment
    print("Checking environment...")
    check_env(env, warn=True)
    print("✅ Environment is valid\n")

    if args.eval_only:
        # Load and evaluate existing model
        print(f"Loading model from {args.model}...")
        model = PPO.load(args.model, env=env)
        evaluate_agent(model, env, n_episodes=args.episodes)
    else:
        # Train new model
        model = train_agent(
            env,
            total_timesteps=args.timesteps,
            model_path=args.output,
            tensorboard_log=args.tensorboard
        )

        # Evaluate
        results = evaluate_agent(model, env, n_episodes=args.episodes)

        # Save best config
        config_path = f"{args.output}_best_config.json"
        with open(config_path, 'w') as f:
            json.dump(results['best_config'], f, indent=2)
        print(f"✅ Best configuration saved to {config_path}")


if __name__ == '__main__':
    main()
