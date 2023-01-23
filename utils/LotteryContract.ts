import Web3 from 'web3'
import { EventData } from 'web3-eth-contract'
import lotteryConfig from '../build/contracts/Lottery.json'
import emitter from './emitter'

type NetworkSettings = Record<string, { address: string }>

const projectUrl = process.env['NEXT_PUBLIC_PROJECT_URL']
const networkId = process.env['NEXT_PUBLIC_NETWORK_ID']

const networkSettings = lotteryConfig.networks as NetworkSettings

const CONTRACT_ABI = lotteryConfig.abi as unknown as AbiItem
const CONTRACT_ADDRESS = networkSettings[networkId ?? 5777].address

export const web3 = new Web3(Web3.givenProvider ?? projectUrl)

export const lotteryContract = new web3.eth.Contract(
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
)

lotteryContract.events.WinnerPicked((error: Error, event: EventData) => {
  if (error) {
    emitter.emit('error-picking-winner', error)
  } else {
    emitter.emit('winner-picked', event)
  }
})

export function getContractAddress(): string {
  return CONTRACT_ADDRESS
}

export async function requestAccounts(): Promise<string[]> {
  return web3.eth.requestAccounts()
}

export async function getBalance(address: string): Promise<string> {
  const balanceWei = await web3.eth.getBalance(address)
  return web3.utils.fromWei(balanceWei)
}

export async function getContractBalance(): Promise<string> {
  return getBalance(CONTRACT_ADDRESS)
}

export async function getContractOwner(): Promise<string> {
  return lotteryContract.methods.owner().call()
}

export async function enterLottery(
  from: string,
  ether: string,
): Promise<string> {
  return lotteryContract.methods.enter().send({
    from,
    value: web3.utils.toWei(ether),
  })
}

export async function getPlayers(from: string): Promise<string[]> {
  if (from) {
    return lotteryContract.methods.getPlayers().call({ from })
  }

  return []
}

export async function numPlayers(from: string): Promise<number> {
  const players = await getPlayers(from)
  return players.length
}

export async function pickWinner(from: string): Promise<void> {
  if (from) {
    return lotteryContract.methods.pickWinner().send({ from })
  }
}

export async function getContractDetails(address: string) {
  const [balance, players, owner, contractBalance] = await Promise.all([
    getBalance(address),
    getPlayers(address),
    getContractOwner(),
    getContractBalance(),
  ])

  const participants = players.length
  const hasEntered = players.includes(address)
  const isManager = owner === address

  return {
    owner,
    players,
    balance,
    isManager,
    hasEntered,
    participants,
    contractBalance,
  }
}