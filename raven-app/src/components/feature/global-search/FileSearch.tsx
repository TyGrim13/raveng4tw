import { SearchIcon } from '@chakra-ui/icons'
import { Avatar, Button, Center, chakra, FormControl, HStack, Icon, Input, InputGroup, InputLeftElement, Link, Stack, TabPanel, Text, Image } from '@chakra-ui/react'
import { FrappeConfig, FrappeContext, useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk'
import { useMemo, useState, useContext, useEffect } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { BiGlobe, BiHash, BiLockAlt } from 'react-icons/bi'
import { useDebounce } from '../../../hooks/useDebounce'
import { ChannelData } from '../../../types/Channel/Channel'
import { GetFileSearchResult } from '../../../types/Search/FileSearch'
import { User } from '../../../types/User/User'
import { getFileExtensionIcon } from '../../../utils/layout/fileExtensionIcon'
import { DateObjectToFormattedDateString } from '../../../utils/operations'
import { AlertBanner } from '../../layout/AlertBanner'
import { EmptyStateForSearch } from '../../layout/EmptyState/EmptyState'
import { FullPageLoader } from '../../layout/Loaders'
import { SelectInput, SelectOption } from '../search-filters/SelectInput'
import { Sort } from '../sorting'
import { AiOutlineFileExcel, AiOutlineFileImage, AiOutlineFilePdf, AiOutlineFilePpt, AiOutlineFileText } from 'react-icons/ai'

interface Props {
    onToggleMyChannels: () => void,
    isOpenMyChannels: boolean,
}

export const FileSearch = ({ onToggleMyChannels, isOpenMyChannels }: Props) => {

    const { url } = useContext(FrappeContext) as FrappeConfig
    const methods = useForm()
    const { watch, control } = methods
    const [searchText, setSearchText] = useState("")
    const debouncedText = useDebounce(searchText, 50)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value)
    }

    const watchFileType = watch('file-type-filter')
    const watchChannel = watch('channel-filter')
    const watchUser = watch('user-filter')
    const watchDate = watch('date-filter')
    const watchMyChannels = watch('my-channels-filter')
    const file_type: string[] = watchFileType ? watchFileType.map((fileType: { value: string, label: string }) => fileType.value) : []
    const in_channel: string[] = watchChannel ? watchChannel.map((channel: { value: string, label: string }) => (channel.value)) : []
    const from_user: string[] = watchUser ? watchUser.map((user: { value: string, label: string }) => (user.value)) : []
    const date = watchDate ? watchDate.value : null
    const my_channel_only: boolean = watchMyChannels ? watchMyChannels : null
    const extensions: string[] = ['pdf', 'doc', 'docx']
    const [message_type, setMessageType] = useState<string[]>([])

    useEffect(() => {
        if (file_type.some(item => extensions.includes(item))) {
            setMessageType(prevState => {
                const newState = prevState.filter(item => item !== 'File');
                return [...newState, 'File'];
            });
        } else {
            setMessageType(prevState => prevState.filter(item => item !== 'File'));
        }

        if (file_type.some(item => item === 'image')) {
            setMessageType(prevState => {
                const newState = prevState.filter(item => item !== 'Image');
                return [...newState, 'Image'];
            });
        } else {
            setMessageType(prevState => prevState.filter(item => item !== 'Image'));
        }

        setMessageType(prevState => [...new Set(prevState)]);
    }, [file_type]);

    const { data: users, error: usersError } = useFrappeGetDocList<User>("User", {
        fields: ["full_name", "user_image", "name"],
        filters: [["name", "!=", "Guest"]]
    })

    const [sortOrder, setSortOrder] = useState("desc")
    const [sortByField, setSortByField] = useState<string>('creation')

    const { data: channels, error: channelsError } = useFrappeGetCall<{ message: ChannelData[] }>("raven.raven_channel_management.doctype.raven_channel.raven_channel.get_channel_list")

    const userOptions: SelectOption[] = useMemo(() => {
        if (users) {
            return users.map((user: User) => ({
                value: user.name,
                label: <HStack><Avatar name={user.full_name} src={url + user.user_image} borderRadius={'md'} size="xs" /><Text>{user.full_name}</Text></HStack>
            }))
        } else {
            return []
        }
    }, [users])

    const channelOption: SelectOption[] = useMemo(() => {
        if (channels) {
            return channels.message.map((channel: ChannelData) => ({
                value: channel.name,
                label: <HStack>{channel.type === "Private" && <BiLockAlt /> || channel.type === "Public" && <BiHash /> || channel.type === "Open" && <BiGlobe />}<Text>{channel.channel_name}</Text></HStack>
            }))
        } else {
            return []
        }
    }, [channels])

    const { data, error, isLoading, isValidating } = useFrappeGetCall<{ message: GetFileSearchResult[] }>("raven.api.search.get_search_result", {
        doctype: 'Raven Message',
        search_text: debouncedText,
        message_type: JSON.stringify(message_type),
        file_type: JSON.stringify(file_type),
        in_channel: JSON.stringify(in_channel),
        from_user: JSON.stringify(from_user),
        date: date,
        my_channel_only: my_channel_only,
        sort_order: sortOrder,
        sort_field: sortByField
    })

    return (
        <TabPanel px={0}>
            <Stack px={4}>
                <InputGroup>
                    <InputLeftElement
                        pointerEvents='none'
                        children={<SearchIcon color='gray.300' />} />
                    <Input
                        autoFocus
                        onChange={handleChange}
                        type='text'
                        placeholder='Search by file name or keyword'
                        value={debouncedText} />
                </InputGroup>
                {!!!usersError && !!!channelsError &&
                    <FormProvider {...methods}>
                        <chakra.form>
                            <HStack justifyContent={'space-between'}>
                                <FormControl id="user-filter" w='fit-content'>
                                    <SelectInput placeholder="From" size='sm' options={userOptions} name='user-filter' isMulti={true} chakraStyles={{
                                        multiValue: (chakraStyles) => ({ ...chakraStyles, display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '0rem 0.2rem 0rem 0rem' }),
                                    }} />
                                </FormControl>
                                <FormControl id="channel-filter" w='fit-content'>
                                    <SelectInput placeholder="In" size='sm' options={channelOption} name='channel-filter' isMulti={true} />
                                </FormControl>
                                <FormControl id="date-filter" w='fit-content'>
                                    <SelectInput placeholder="Date" size='sm' options={dateOption} name='date-filter' isClearable={true} />
                                </FormControl>
                                <FormControl id="file-type-filter" w='fit-content'>
                                    <SelectInput placeholder="File type" size='sm' options={fileOption} name='file-type-filter' isMulti={true} />
                                </FormControl>
                                <FormControl id="my-channels-filter" w='fit-content'>
                                    <Controller
                                        name="my-channels-filter"
                                        control={control}
                                        render={({ field: { onChange, value } }) => (
                                            <Button
                                                size="sm"
                                                w="9rem"
                                                isActive={value = isOpenMyChannels}
                                                onClick={() => {
                                                    onToggleMyChannels()
                                                    onChange(!value)
                                                }}
                                            >
                                                Only my channels
                                            </Button>
                                        )}
                                    />
                                </FormControl>
                            </HStack>
                        </chakra.form>
                    </FormProvider>}
            </Stack>
            <Stack h='420px' p={4}>

                {error ? <AlertBanner status='error' heading={error.message}>{error.httpStatus} - {error.httpStatusText}</AlertBanner> :
                    (isLoading && isValidating ? <FullPageLoader /> :
                        (!!!error && data?.message && data.message.length > 0 ?
                            <><Sort
                                sortingFields={[{ label: 'Created on', field: 'creation' }]}
                                onSortFieldSelect={(selField) => setSortByField(selField)}
                                sortOrder={sortOrder}
                                sortField={sortByField}
                                onSortOrderChange={(order) => setSortOrder(order)} />
                                <Stack spacing={4} overflowY='scroll'>

                                    {data.message.map((f) => {
                                        return (
                                            f.message_type != 'Text' &&
                                            <HStack spacing={3}>
                                                <Center maxW='50px'>
                                                    {f.message_type === 'File' && <Icon as={getFileExtensionIcon(f.file.split('.')[1])} boxSize="9" />}
                                                    {f.message_type === 'Image' && <Image src={f.file} alt='File preview' boxSize={'36px'} rounded='md' fit='cover' />}
                                                </Center>
                                                <Stack spacing={0}>
                                                    {f.file && <Text fontSize='sm' as={Link} href={f.file} isExternal>{f.file.split('/')[3]}</Text>}
                                                    {users && <Text fontSize='xs' color='gray.500'>Shared by {users.find((user) => user.name === f.owner)?.full_name} on {DateObjectToFormattedDateString(new Date(f.creation ?? ''))}</Text>}
                                                </Stack>
                                            </HStack>
                                        )
                                    }
                                    )}
                                </Stack></> : <EmptyStateForSearch />))}
            </Stack>
        </TabPanel>
    )
}

const fileOption: SelectOption[] = [
    { label: <HStack><AiOutlineFilePdf /><Text>PDFs</Text></HStack>, value: "pdf" },
    { label: <HStack><AiOutlineFileText /><Text>Documents</Text></HStack>, value: "doc" },
    { label: <HStack><AiOutlineFilePpt /><Text>Presentations</Text></HStack>, value: "ppt" },
    { label: <HStack><AiOutlineFileExcel /><Text>Spreadsheets</Text></HStack>, value: "xls" },
    { label: <HStack><AiOutlineFileImage /><Text>Image</Text></HStack>, value: "image" }
]

const dateOption: SelectOption[] = [
    { label: "Today", value: getDateString(0) },
    { label: "Yesterday", value: getDateString(-1) },
    { label: "Last 7 days", value: getDateString(-6) },
    { label: "Last 30 days", value: getDateString(-29) },
    { label: "Last three months", value: getDateString(-89) },
    { label: "Last 12 months", value: getDateString(-364) }
]

function getDateString(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day} 00:00:00`;
}