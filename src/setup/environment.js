// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

import { $, fs, path } from 'zx';
import { constants as fsConstants } from 'fs';
import chalk from 'chalk';
import { PentestError } from '../error-handling.js';

// Pure function: Setup local repository for testing
export async function setupLocalRepo(repoPath) {
  try {
    const sourceDir = path.resolve(repoPath);
    let workingDir = sourceDir;

    // Verify repository is writable; if not, create a writable workspace copy
    try {
      await fs.access(sourceDir, fsConstants.W_OK);
    } catch {
      const workspaceRoot = path.join(process.cwd(), 'repos');
      await fs.ensureDir(workspaceRoot);
      workingDir = await fs.mkdtemp(path.join(workspaceRoot, 'workspace-'));

      console.log(chalk.yellow(`⚠️ Repository not writable. Creating workspace copy at ${workingDir}`));
      await fs.copy(sourceDir, workingDir, { overwrite: false, errorOnExist: false });
      console.log(chalk.green('✅ Workspace copy created successfully'));
    }

    // MCP servers are now configured via mcpServers option in claude-executor.js
    // No need for pre-setup with claude CLI

    // Initialize git repository if not already initialized and create checkpoint
    try {
      // Check if it's already a git repository
      const isGitRepo = await fs.pathExists(path.join(workingDir, '.git'));

      if (!isGitRepo) {
        await $`cd ${workingDir} && git init`;
        console.log(chalk.blue('✅ Git repository initialized'));
      }

      // Configure git for pentest agent
      await $`cd ${workingDir} && git config user.name "Pentest Agent"`;
      await $`cd ${workingDir} && git config user.email "agent@localhost"`;

      // Create initial checkpoint
      await $`cd ${workingDir} && git add -A && git commit -m "Initial checkpoint: Local repository setup" --allow-empty`;
      console.log(chalk.green('✅ Initial checkpoint created'));
    } catch (gitError) {
      console.log(chalk.yellow(`⚠️ Git setup warning: ${gitError.message}`));
      // Non-fatal - continue without Git setup
    }

    // MCP tools (save_deliverable, generate_totp) are now available natively via shannon-helper MCP server
    // No need to copy bash scripts to target repository

    return workingDir;
  } catch (error) {
    if (error instanceof PentestError) {
      throw error;
    }
    throw new PentestError(
      `Local repository setup failed: ${error.message}`,
      'filesystem',
      false,
      { repoPath, originalError: error.message }
    );
  }
}