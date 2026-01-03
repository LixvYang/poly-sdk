/**
 * Generic Binary Markets Example
 *
 * This example demonstrates how to use CTF Client with any binary market,
 * not just YES/NO markets. Works with sports betting, elections, predictions, etc.
 *
 * Usage:
 *   npx ts-node examples/04-generic-binary-markets.ts
 */

import { CTFClient, BinaryOutcomeConfig } from '../src/clients/ctf-client';


async function main() {
  // Initialize CTF Client
  const ctf = new CTFClient({
    privateKey: process.env.PRIVATE_KEY!,
    rpcUrl: process.env.RPC_URL,
  });

  console.log('=== Generic Binary Market Examples ===\n');
  console.log(`Wallet: ${ctf.getAddress()}\n`);

  // Example 1: Sports Betting - Team A vs Team B
  console.log('--- Example 1: Sports Betting (Team A vs Team B) ---');

  const sportsMarketConfig: BinaryOutcomeConfig = {
    outcome0: 'TEAM_A',
    outcome1: 'TEAM_B',
  };

  // Replace with actual values from your market
  const sportsConditionId = '0x1234...'; // From CLOB API
  const teamATokenId = '12345...'; // From CLOB API
  const teamBTokenId = '67890...'; // From CLOB API

  try {
    // Check balances
    const sportsBalance = await ctf.getGenericPositionBalance(
      sportsConditionId,
      teamATokenId,
      teamBTokenId,
      sportsMarketConfig
    );
    console.log(`Team A Balance: ${sportsBalance.balance0}`);
    console.log(`Team B Balance: ${sportsBalance.balance1}\n`);

    // Check market resolution
    const sportsResolution = await ctf.getGenericMarketResolution(
      sportsConditionId,
      sportsMarketConfig
    );
    if (sportsResolution.isResolved) {
      console.log(`Market Resolved! Winner: ${sportsResolution.winningOutcomeName}`);
      console.log(`Winning Index: ${sportsResolution.winningOutcomeIndex}\n`);

      // Redeem winning tokens
      const redeemResult = await ctf.redeemGenericPosition(
        sportsConditionId,
        teamATokenId,
        teamBTokenId,
        sportsMarketConfig
      );
      console.log(`Redeemed ${redeemResult.tokensRedeemed} ${redeemResult.outcomeName} tokens`);
      console.log(`Received ${redeemResult.usdcReceived} USDC`);
      console.log(`TX: ${redeemResult.txHash}\n`);
    } else {
      console.log('Market not resolved yet\n');

      // Merge positions if you have both tokens
      const hasEnough =
        parseFloat(sportsBalance.balance0) >= 10 &&
        parseFloat(sportsBalance.balance1) >= 10;

      if (hasEnough) {
        const mergeResult = await ctf.mergeGenericPosition(
          sportsConditionId,
          teamATokenId,
          teamBTokenId,
          '10',
          sportsMarketConfig
        );
        console.log(`Merged 10 pairs of tokens`);
        console.log(`Received ${mergeResult.usdcReceived} USDC`);
        console.log(`TX: ${mergeResult.txHash}\n`);
      }
    }
  } catch (error) {
    console.error('Sports market error:', error);
  }

  // Example 2: Election - Candidate X vs Candidate Y
  console.log('\n--- Example 2: Election (Candidate X vs Candidate Y) ---');

  const electionConfig: BinaryOutcomeConfig = {
    outcome0: 'CANDIDATE_X',
    outcome1: 'CANDIDATE_Y',
  };

  const electionConditionId = '0x5678...'; // From CLOB API
  const candidateXTokenId = '11111...'; // From CLOB API
  const candidateYTokenId = '22222...'; // From CLOB API

  try {
    // Check balances
    const electionBalance = await ctf.getGenericPositionBalance(
      electionConditionId,
      candidateXTokenId,
      candidateYTokenId,
      electionConfig
    );
    console.log(`Candidate X Balance: ${electionBalance.balance0}`);
    console.log(`Candidate Y Balance: ${electionBalance.balance1}\n`);

    // Check resolution
    const electionResolution = await ctf.getGenericMarketResolution(
      electionConditionId,
      electionConfig
    );
    console.log(`Resolved: ${electionResolution.isResolved}`);
    if (electionResolution.isResolved) {
      console.log(`Winner: ${electionResolution.winningOutcomeName}`);
    }
  } catch (error) {
    console.error('Election market error:', error);
  }

  // Example 3: Generic Binary Market (without outcome names)
  console.log('\n--- Example 3: Generic Binary Market (Index-based) ---');

  const genericConditionId = '0xabcd...';
  const genericToken0 = '33333...';
  const genericToken1 = '44444...';

  try {
    // Without outcome config, just use indices
    const genericBalance = await ctf.getGenericPositionBalance(
      genericConditionId,
      genericToken0,
      genericToken1
    );
    console.log(`Outcome 0 Balance: ${genericBalance.balance0}`);
    console.log(`Outcome 1 Balance: ${genericBalance.balance1}\n`);

    const genericResolution = await ctf.getGenericMarketResolution(genericConditionId);
    if (genericResolution.isResolved) {
      console.log(`Winning outcome index: ${genericResolution.winningOutcomeIndex}`);

      // Redeem specific outcome by index
      const redeemResult = await ctf.redeemGenericPosition(
        genericConditionId,
        genericToken0,
        genericToken1,
        undefined,
        genericResolution.winningOutcomeIndex // Explicitly specify outcome
      );
      console.log(`Redeemed outcome ${redeemResult.outcomeIndex}`);
      console.log(`Received ${redeemResult.usdcReceived} USDC\n`);
    }
  } catch (error) {
    console.error('Generic market error:', error);
  }

  // Example 4: Redeem ALL positions at once
  console.log('\n--- Example 4: Redeem All Positions (Both Outcomes) ---');

  const allRedeemConditionId = '0xdef0...'; // From CLOB API
  const allRedeemToken0 = '55555...'; // From CLOB API
  const allRedeemToken1 = '66666...'; // From CLOB API

  const allRedeemConfig: BinaryOutcomeConfig = {
    outcome0: 'OPTION_A',
    outcome1: 'OPTION_B',
  };

  try {
    // This is useful for split resolutions or when holding both tokens
    const redeemAllResult = await ctf.redeemAllGenericPositions(
      allRedeemConditionId,
      allRedeemToken0,
      allRedeemToken1,
      allRedeemConfig
    );

    console.log(`Success! Redeemed all positions`);
    console.log(`Total USDC received: ${redeemAllResult.totalUsdcReceived}`);
    console.log(`Total gas used: ${redeemAllResult.totalGasUsed}`);
    console.log(`Number of transactions: ${redeemAllResult.txHashes.length}\n`);

    console.log('Breakdown:');
    redeemAllResult.outcomes.forEach((outcome, index) => {
      console.log(`  ${index + 1}. ${outcome.outcomeName || `Outcome ${outcome.outcomeIndex}`}:`);
      console.log(`     Tokens redeemed: ${outcome.tokensRedeemed}`);
      console.log(`     USDC received: ${outcome.usdcReceived}`);
      console.log(`     TX: ${outcome.txHash}`);
      console.log(`     Gas used: ${outcome.gasUsed}\n`);
    });
  } catch (error) {
    console.error('Redeem all error:', error);
  }

  console.log('\n=== Summary ===');
  console.log('The new generic methods support ANY binary market:');
  console.log('- getGenericPositionBalance() - Check balances for any two outcomes');
  console.log('- getGenericMarketResolution() - Check resolution for any binary market');
  console.log('- mergeGenericPosition() - Merge any two outcome tokens to USDC');
  console.log('- redeemGenericPosition() - Redeem winning tokens from any binary market');
  console.log('- redeemAllGenericPositions() - Redeem ALL tokens (both outcomes) at once');
  console.log('\nAll methods support:');
  console.log('1. Named outcomes (Team A vs B, Candidate X vs Y, etc.)');
  console.log('2. Index-based outcomes (0 vs 1)');
  console.log('3. Auto-detection of winning outcome');
  console.log('4. Clear error messages with custom outcome names');
  console.log('\nUse cases for redeemAllGenericPositions():');
  console.log('- Split resolutions where both outcomes have value');
  console.log('- Cleaning up all positions after market resolution');
  console.log('- One-call redemption of all held tokens');
}

main().catch(console.error);
